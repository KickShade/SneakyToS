#!/usr/bin/env python
"""
SneakyToS - Localized contamination QC, v3
==========================================
Input : segmented_policy_clauses.csv
Output: contamination_regions.csv, transition_qc.csv, clause_qc.csv,
        qc_validation_sample.csv, qc_config.json

Design principles
  * Unit of detection = contiguous REGION of clauses inside ONE version (OLD or NEW).
  * Nothing is ever deleted at transition level. At most, HIGH-confidence regions
    are *masked* (clause-level, reversible via clause_qc.csv).
  * Decisions are rule-based on independent evidence FAMILIES (not one score):
        semantic   : region is unlike policy language AND unlike its own document
        register   : region lacks policy register (we/you/may/consent/...)
        structural : HTML/CSS artifacts, nav strips, duplicated blocks
        cross-ver  : region has no counterpart in the other version
  * Rights guard: a region that contains data-practice language can never be HIGH.
  * Persistent regions (present in both versions) are KEEP_PERSISTENT: they cannot
    create spurious OLD->NEW "changes".
  * No topical keyword lists (news/sports/...). Only function-word register cues,
    generic web-boilerplate cues, and embedding similarity to policy anchors.

Usage
  pip install pandas numpy scikit-learn sentence-transformers
  python policy_qc_v3.py --input segmented_policy_clauses.csv --outdir qc_out
  python policy_qc_v3.py --input ... --no-embeddings     # TF-IDF+SVD fallback
  python policy_qc_v3.py --input ... --selftest           # injection validation
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from collections import Counter
from dataclasses import dataclass, asdict

import numpy as np
import pandas as pd

# ----------------------------------------------------------------------------
# Config
# ----------------------------------------------------------------------------


@dataclass
class Config:
    model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    seed: int = 13
    min_clauses: int = 10            # versions shorter than this are not analysed
    short_tok: int = 6               # clauses shorter than this are "neutral"
    tau_percentile: float = 5.0      # low-policy-sim threshold: pctl of register-bearing clauses
    min_group_for_domain_tau: int = 1500
    max_gap_nonneutral: int = 1      # non-candidate clauses tolerated inside a region
    max_gap_neutral: int = 3         # short/neutral clauses tolerated inside a region
    edge_clauses: int = 3            # "at start/end of document"
    flank: int = 4                   # local-context half-window
    match_thr: float = 0.88          # cosine for "clause exists in other version"
    xver_min_overall: float = 0.15   # below this the other version is a rewrite -> xver uninformative
    persistent_frac: float = 0.8
    nonpersistent_frac: float = 0.2
    guard_practice_frac: float = 0.15
    heavy_region_frac: float = 0.5   # region covering > this of a version cannot be HIGH
    heavy_mask_frac: float = 0.4     # transition-level REVIEW_HEAVY
    w_policy: float = 0.30
    w_ctx: float = 0.15
    w_reg: float = 0.20
    w_struct: float = 0.15
    w_xver: float = 0.15
    w_pos: float = 0.05


# ----------------------------------------------------------------------------
# Text cues (function-word / generic-web cues only; NO topical vocab)
# ----------------------------------------------------------------------------
RE_PRONOUN = re.compile(r"\b(we|our|ours|us|you|your|yours)\b", re.I)
RE_LEGAL = re.compile(
    r"\b(personal (information|data)|privacy|cookies?|terms|consent|third[- ]part(y|ies)|"
    r"opt[- ]out|data protection|gdpr|ccpa|affiliates?|subsidiar\w+|licen[sc]e\w*|"
    r"liab\w+|disclos\w+|retain\w*|retention|collect\w*|processing|policy|policies|"
    r"agree\w*|rights?)\b", re.I)
RE_PRACTICE_VERB = re.compile(
    r"\b(collect\w*|share[sd]?|sharing|disclos\w+|retain\w*|stor(e|es|ed|ing)|"
    r"transfer\w*|sell|sold|process\w*)\b", re.I)
RE_PRACTICE_OBJ = re.compile(
    r"\b(information|data|content|cookies?|identifiers?|location|device|account|profile)\b", re.I)
RE_PRACTICE_LEGAL = re.compile(
    r"\b(consent|opt[- ]out|third[- ]part(y|ies)|affiliates?|licen[sc]e)\b", re.I)

RE_ARTIFACT = [
    re.compile(r"</?[a-z][^>]{0,80}>", re.I),
    re.compile(r"&(nbsp|amp|lt|gt|quot|#\d+);", re.I),
    re.compile(r"\{\{|\}\}"),
    re.compile(r"\bfunction\s*\("),
    re.compile(r"\bvar\s+\w+\s*="),
    re.compile(r"\.(css|js)\b", re.I),
    re.compile("\ufffd"),
    re.compile(r"(\\n|\\t|\\u[0-9a-f]{4})", re.I),
    re.compile(r"[\w-]+\s*:\s*[^;]{1,40};\s*[\w-]+\s*:"),
    re.compile(r"(?:[^\w\s]\s*){8,}"),
    re.compile(r"[A-Za-z0-9+/=]{40,}"),
]
# generic web-boilerplate tokens (page chrome, not a topic)
NAV_WORDS = {
    "home", "about", "contact", "login", "log", "sign", "subscribe", "menu", "search",
    "share", "tweet", "facebook", "twitter", "advertisement", "advertise", "careers",
    "sitemap", "newsletter", "rss", "comments", "print", "email", "more", "next",
    "previous", "skip", "copyright", "register", "cart", "account", "faq", "help",
}
RE_TOKEN = re.compile(r"[A-Za-z][A-Za-z'-]*")
RE_SEP = re.compile(r"[|»›·]")

POLICY_ANCHORS = [
    "We collect personal information that you provide to us, such as your name and email address.",
    "We use the information we collect to provide, maintain and improve our services.",
    "We may share your information with third-party service providers who perform services on our behalf.",
    "We do not sell your personal information to third parties.",
    "This policy describes how we collect, use and disclose information when you use our website.",
    "We use cookies and similar tracking technologies to analyze trends and administer the site.",
    "You may opt out of receiving promotional communications by following the instructions in the message.",
    "We retain your information for as long as necessary to fulfil the purposes described in this policy.",
    "We take reasonable measures to protect your information from loss, misuse and unauthorized access.",
    "Our services are not directed to children under the age of 13 and we do not knowingly collect their data.",
    "We may update this privacy policy from time to time and will notify you of material changes.",
    "If you have questions about this policy, please contact us at the address below.",
    "You may have the right to access, correct or delete the personal data we hold about you.",
    "We may disclose your information if required by law or in response to legal process.",
    "In the event of a merger or acquisition your information may be transferred to the acquiring company.",
    "We use third-party advertising partners to show you personalized advertisements.",
    "Information you post publicly on forums, comments or profiles may be visible to other users.",
    "We use analytics providers to understand how visitors use our services.",
    "By using the service you agree to these terms and conditions.",
    "You grant us a non-exclusive, worldwide license to use content that you submit to the service.",
    "We may terminate or suspend your account at any time without notice.",
    "These terms are governed by the laws of the jurisdiction in which the company is established.",
    "The service is provided as is without warranties of any kind, and we are not liable for damages.",
    "We process personal data on the basis of your consent or our legitimate interests.",
    "We may use your data to train and improve our machine learning models.",
    "Device information such as IP address, browser type and operating system is collected automatically.",
    "Payment information is processed by our payment processor and is not stored on our servers.",
    "Links to other websites are governed by the privacy practices of those sites.",
    "Your location information may be collected when you use features that require it.",
    "Definitions: 'Personal Data' means any information relating to an identified or identifiable person.",
]


def norm_text(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(s).lower()).strip()


# ----------------------------------------------------------------------------
# Embeddings
# ----------------------------------------------------------------------------
class Embedder:
    """Unit-norm clause embeddings. SBERT if available, else TF-IDF+SVD fallback."""

    def __init__(self, cfg: Config, use_embeddings: bool = True, cache_dir: str = "qc_cache"):
        self.cfg, self.cache_dir = cfg, cache_dir
        self.mode = "sbert"
        self.model = None
        if use_embeddings:
            try:
                from sentence_transformers import SentenceTransformer
                self.model = SentenceTransformer(cfg.model_name)
            except Exception as e:  # pragma: no cover
                print(f"[warn] sentence-transformers unavailable ({e}); using TF-IDF fallback")
        if self.model is None:
            self.mode = "tfidf"
        self._tfidf = None
        self._svd = None

    @staticmethod
    def _unit(x):
        n = np.linalg.norm(x, axis=1, keepdims=True)
        return x / np.maximum(n, 1e-9)

    def fit_texts(self, texts):
        if self.mode == "tfidf" and self._tfidf is None:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.decomposition import TruncatedSVD
            self._tfidf = TfidfVectorizer(sublinear_tf=True, min_df=2, ngram_range=(1, 2),
                                          max_features=60000)
            X = self._tfidf.fit_transform(list(texts) + POLICY_ANCHORS)
            k = min(128, X.shape[1] - 1)
            self._svd = TruncatedSVD(k, random_state=self.cfg.seed).fit(X)

    def encode(self, texts, batch_size=256, tag=""):
        texts = list(texts)
        if self.mode == "tfidf":
            return self._unit(self._svd.transform(self._tfidf.transform(texts))).astype(np.float32)
        key = hashlib.md5(("\n".join(texts) + self.cfg.model_name).encode("utf-8")).hexdigest()
        path = os.path.join(self.cache_dir, f"emb_{tag}_{key}.npy")
        if os.path.exists(path):
            return np.load(path)
        os.makedirs(self.cache_dir, exist_ok=True)
        emb = self.model.encode(texts, batch_size=batch_size, show_progress_bar=True,
                                normalize_embeddings=True, convert_to_numpy=True).astype(np.float32)
        np.save(path, emb)
        return emb


# ----------------------------------------------------------------------------
# Loading + clause-level features
# ----------------------------------------------------------------------------
def load_clauses(path: str, domain_col: str) -> pd.DataFrame:
    df = pd.read_csv(path, encoding="utf-8-sig", dtype={"transition_id": str, "version": str})
    need = {"transition_id", "version", "clause_id", "clause_text"}
    miss = need - set(df.columns)
    if miss:
        sys.exit(f"Missing columns: {miss}")
    df["version"] = df["version"].str.upper().str.strip()
    df["clause_text"] = df["clause_text"].fillna("").astype(str)
    if domain_col not in df.columns:
        print(f"[warn] domain column '{domain_col}' missing; using a single global domain")
        df[domain_col] = "ALL"
    df["_domain"] = df[domain_col].fillna("UNK").astype(str)
    if df["_domain"].nunique() > 60:
        print("[warn] >60 distinct domain values - looks like per-site domains; using global calibration")
        df["_domain"] = "ALL"
    df["_row"] = np.arange(len(df))
    df["pos"] = df.groupby(["transition_id", "version"], sort=False).cumcount()
    return df


def add_clause_features(df: pd.DataFrame, cfg: Config) -> pd.DataFrame:
    txt = df["clause_text"]
    df["ntok"] = txt.map(lambda s: len(RE_TOKEN.findall(s)))
    df["norm"] = txt.map(norm_text)
    df["h"] = pd.factorize(df["norm"])[0]
    df["reg"] = txt.map(lambda s: bool(RE_PRONOUN.search(s) or RE_LEGAL.search(s)))
    df["prac"] = txt.map(
        lambda s: bool((RE_PRACTICE_VERB.search(s) and RE_PRACTICE_OBJ.search(s))
                       or RE_PRACTICE_LEGAL.search(s)))
    df["artifact"] = txt.map(lambda s: any(r.search(s) for r in RE_ARTIFACT))

    def nav(s):
        toks = [t.lower() for t in RE_TOKEN.findall(s)]
        if not toks:
            return False
        nw = len(set(toks) & NAV_WORDS)
        seps = len(RE_SEP.findall(s))
        return (nw >= 3 and len(toks) <= 40) or seps >= 3

    df["nav"] = txt.map(nav)
    df["neutral"] = df["ntok"] < cfg.short_tok
    df["strong"] = df["artifact"] | (df["nav"] & ~df["reg"])
    return df


def add_embedding_features(df: pd.DataFrame, emb: Embedder, cfg: Config):
    uniq, inv = np.unique(df["norm"].values, return_inverse=True)
    # embed original-cased text of first occurrence (more informative than normalized)
    first = pd.Series(df["clause_text"].values).groupby(inv).first().values
    emb.fit_texts(first)
    U = emb.encode(first, tag="clauses")
    A = emb.encode(POLICY_ANCHORS, tag="anchors")
    E = U[inv]
    P = (U @ A.T).max(axis=1)[inv]
    return E, P


def calibrate(df: pd.DataFrame, P: np.ndarray, cfg: Config) -> dict:
    """tau (low-policy-sim threshold) per domain from register-bearing clauses; scale = distance to median."""
    ok = df["reg"].values & ~df["neutral"].values
    g_p = P[ok]
    g_tau = float(np.percentile(g_p, cfg.tau_percentile))
    g_med = float(np.median(g_p))
    tau = {}
    for d, sub in df.groupby("_domain"):
        m = ok[sub.index.values]
        p = P[sub.index.values][m]
        tau[d] = float(np.percentile(p, cfg.tau_percentile)) if len(p) >= cfg.min_group_for_domain_tau else g_tau
    return {"tau": tau, "global_tau": g_tau, "scale": max(0.08, g_med - g_tau), "global_median_p": g_med}


# ----------------------------------------------------------------------------
# Region detection
# ----------------------------------------------------------------------------
def clip01(x):
    return float(min(1.0, max(0.0, x)))


def unit(v):
    return v / max(np.linalg.norm(v), 1e-9)


def find_runs(cand, neutral, cfg):
    n, runs, i = len(cand), [], 0
    while i < n:
        if not cand[i]:
            i += 1
            continue
        start = end = i
        j, g_nn, g_n = i + 1, 0, 0
        while j < n:
            if cand[j]:
                end, g_nn, g_n = j, 0, 0
            else:
                if neutral[j]:
                    g_n += 1
                else:
                    g_nn += 1
                if g_nn > cfg.max_gap_nonneutral or g_n > cfg.max_gap_neutral:
                    break
            j += 1
        runs.append((start, end))
        i = end + 1
    return runs


def analyze_version(ix, match, other_overall, E, P, cols, tau, scale, cfg, tid, ver, df_ids):
    """ix: row indices (ordered) of one version. match: best cosine to other version per clause (or None)."""
    n = len(ix)
    if n < cfg.min_clauses:
        return [], {"status": "TOO_SHORT"}
    e, p = E[ix], P[ix]
    neutral, reg, prac = cols["neutral"][ix], cols["reg"][ix], cols["prac"][ix]
    strong, h, ntok = cols["strong"][ix], cols["h"][ix], cols["ntok"][ix]

    sem = (p < tau) & (~reg) & (~neutral)
    cand = sem | strong
    runs = find_runs(cand, neutral, cfg)

    cnt = Counter(h.tolist())
    dup = np.array([(cnt[x] > 1 and t >= 8) for x, t in zip(h, ntok)])
    xver_ok = match is not None and other_overall >= cfg.xver_min_overall

    regions = []
    for (s, t) in runs:
        n_cand = int(cand[s:t + 1].sum())
        at_edge = s < cfg.edge_clauses or t >= n - cfg.edge_clauses
        if n_cand < 2 and not strong[s:t + 1].any() and not at_edge:
            continue
        inside = np.zeros(n, bool)
        inside[s:t + 1] = True
        out = ~inside
        if out.sum() < 5:
            continue
        L = t - s + 1
        cen_out = unit(e[out].mean(0))
        ctx_reg = float((e[inside] @ cen_out).mean())
        base = float(np.median(e[out] @ cen_out))
        s_global = clip01((base - ctx_reg) / scale)

        # local discontinuity: region clauses vs flanking centroid, baseline = outside clauses vs their neighbours
        lo, hi = max(0, s - cfg.flank), min(n, t + 1 + cfg.flank)
        flank_ix = [k for k in list(range(lo, s)) + list(range(t + 1, hi))]
        if flank_ix:
            fc = unit(e[flank_ix].mean(0))
            bsim = float((e[inside] @ fc).mean())
        else:
            bsim = ctx_reg
        nb = []
        for k in np.flatnonzero(out)[:: max(1, out.sum() // 40)]:
            w = [q for q in range(max(0, k - cfg.flank), min(n, k + cfg.flank + 1)) if q != k and not inside[q]]
            if w:
                nb.append(float(e[k] @ unit(e[w].mean(0))))
        base_local = float(np.median(nb)) if nb else base
        s_local = clip01((base_local - bsim) / scale)
        s_ctx = 0.5 * s_global + 0.5 * s_local

        m_in = inside & ~neutral
        m_out = out & ~neutral
        p_reg = float(p[m_in].mean()) if m_in.any() else float(p[inside].mean())
        p_out = float(np.median(p[m_out])) if m_out.any() else float(np.median(p[out]))
        s_policy = clip01((p_out - p_reg) / scale)

        r_reg, r_out = float(reg[inside].mean()), float(reg[out].mean())
        s_reg = clip01((r_out - r_reg) / max(r_out, 0.3))

        strong_frac = float(strong[inside].mean())
        dup_frac = float(dup[inside].mean())
        dup_flag = L >= 3 and dup_frac >= 0.6
        s_struct = max(strong_frac, 1.0 if dup_flag else 0.0)

        pf = float((match[ix][inside] >= cfg.match_thr).mean()) if match is not None else float("nan")
        s_x = clip01(1 - pf) if xver_ok else 0.0
        s_pos = 1.0 if at_edge else 0.0

        score = (cfg.w_policy * s_policy + cfg.w_ctx * s_ctx + cfg.w_reg * s_reg +
                 cfg.w_struct * s_struct + cfg.w_xver * s_x + cfg.w_pos * s_pos)

        fam_sem = s_policy >= 0.5 and s_ctx >= 0.4
        fam_reg = s_reg >= 0.6
        fam_struct = s_struct >= 0.5
        fam_x = xver_ok and pf <= cfg.nonpersistent_frac
        persistent = xver_ok and pf >= cfg.persistent_frac
        guard = float(prac[inside].mean()) > cfg.guard_practice_frac
        dominates = L / n > cfg.heavy_region_frac
        n_fam = int(fam_sem) + int(fam_reg) + int(fam_struct) + int(fam_x)

        if persistent:
            conf = "PERSISTENT"
        elif (fam_sem and fam_reg and (fam_x or fam_struct) and (n_cand >= 2 or fam_struct)
              and not guard and not dominates):
            conf = "HIGH"
        elif n_fam >= 2:
            conf = "MEDIUM"
        else:
            conf = "LOW"
        action = {"HIGH": "MASK_CLAUSES", "MEDIUM": "REVIEW", "LOW": "KEEP_FLAGGED",
                  "PERSISTENT": "KEEP_PERSISTENT"}[conf]

        ev, ke = [], []
        if fam_sem:
            ev.append(f"semantic: policy-anchor sim {p_reg:.2f} vs doc median {p_out:.2f}; "
                      f"clause-to-context sim {ctx_reg:.2f} vs {base:.2f}; local {bsim:.2f} vs {base_local:.2f}")
        if fam_reg:
            ev.append(f"register: policy-register cues in {r_reg:.0%} of region vs {r_out:.0%} of rest of doc")
        if strong_frac > 0:
            ev.append(f"structural: artifact/nav-like clauses {strong_frac:.0%}")
        if dup_flag:
            ev.append(f"structural: duplicated block ({dup_frac:.0%} of clauses repeat elsewhere in same version)")
        if fam_x:
            ev.append(f"cross-version: only {pf:.0%} of region clauses have a match in the other version")
        if not xver_ok:
            ev.append("cross-version: uninformative (other version is largely rewritten or missing)")
        if at_edge:
            ev.append("position: at document start/end")
        if persistent:
            ke.append(f"present in other version ({pf:.0%} matched) -> cannot create spurious changes")
        if guard:
            ke.append("rights guard: region contains data-practice language (capped below HIGH)")
        if dominates:
            ke.append("region covers >50% of version (capped below HIGH)")
        if not fam_sem and sem[s:t + 1].any():
            ke.append("semantic signal weak: coherent with doc / policy-like")

        ids = df_ids[ix]
        regions.append(dict(
            transition_id=tid, version=ver, start_pos=s, end_pos=t,
            start_clause=ids[s], end_clause=ids[t], n_clauses=L, n_candidate=n_cand,
            suspicion_score=round(score, 3), confidence=conf, recommended_action=action,
            fam_semantic=fam_sem, fam_register=fam_reg, fam_structural=fam_struct, fam_xver=fam_x,
            s_policy=round(s_policy, 3), s_ctx=round(s_ctx, 3), s_reg=round(s_reg, 3),
            s_struct=round(s_struct, 3), s_xver=round(s_x, 3),
            region_policy_sim=round(p_reg, 3), doc_policy_sim=round(p_out, 3),
            register_rate_region=round(r_reg, 3), register_rate_doc=round(r_out, 3),
            persistence_frac=None if pf != pf else round(pf, 3), xver_informative=xver_ok,
            internal_coherence=round(float((np.sum(e[inside], 0) @ np.sum(e[inside], 0) - L) / (L * (L - 1))), 3) if L > 1 else None,
            rights_guard=guard, at_edge=at_edge, region_frac=round(L / n, 3),
            evidence=" | ".join(ev), keep_reasons=" | ".join(ke)))
    return regions, {"status": "OK", "n": n, "worst_pos": int(np.argmin(np.where(neutral, 9, p)))}


def run_pipeline(df: pd.DataFrame, E, P, cal, cfg: Config):
    cols = {k: df[k].values for k in ["neutral", "reg", "prac", "strong", "h", "ntok"]}
    ids = df["clause_id"].values
    dom = df["_domain"].values
    groups = df.groupby(["transition_id", "version"], sort=False).indices
    tids = list(dict.fromkeys(df["transition_id"].values))
    regions, tq_rows = [], []
    match_all = np.full(len(df), np.nan, dtype=np.float32)
    overall = {}

    # cross-version matching
    for tid in tids:
        o, n_ = groups.get((tid, "OLD")), groups.get((tid, "NEW"))
        if o is None or n_ is None:
            continue
        S = E[o] @ E[n_].T
        match_all[o] = S.max(1)
        match_all[n_] = S.max(0)
        overall[(tid, "OLD")] = float((S.max(1) >= cfg.match_thr).mean())
        overall[(tid, "NEW")] = float((S.max(0) >= cfg.match_thr).mean())

    for tid in tids:
        info = {}
        for ver in ("OLD", "NEW"):
            ix = groups.get((tid, ver))
            if ix is None:
                info[ver] = ({}, [], {"status": "MISSING"})
                continue
            ix = np.sort(ix)
            other = "NEW" if ver == "OLD" else "OLD"
            has_other = (tid, other) in groups
            tau = cal["tau"].get(dom[ix[0]], cal["global_tau"])
            regs, meta = analyze_version(
                ix, match_all if has_other else None, overall.get((tid, ver), 0.0),
                E, P, cols, tau, cal["scale"], cfg, tid, ver, ids)
            info[ver] = (ix, regs, meta)
            regions.extend(regs)

        row = {"transition_id": tid}
        status_parts, any_heavy = [], False
        for ver in ("OLD", "NEW"):
            ix, regs, meta = info[ver]
            k = ver.lower()
            row[f"n_clauses_{k}"] = 0 if meta["status"] == "MISSING" else len(ix)
            row[f"status_{k}"] = meta["status"]
            hi = [r for r in regs if r["confidence"] == "HIGH"]
            masked = sum(r["n_clauses"] for r in hi)
            row[f"n_regions_{k}"] = len(regs)
            row[f"n_high_{k}"] = len(hi)
            row[f"n_medium_{k}"] = sum(r["confidence"] == "MEDIUM" for r in regs)
            row[f"n_persistent_{k}"] = sum(r["confidence"] == "PERSISTENT" for r in regs)
            row[f"masked_frac_{k}"] = round(masked / max(1, row[f"n_clauses_{k}"]), 3)
            if row[f"masked_frac_{k}"] > cfg.heavy_mask_frac:
                any_heavy = True
            row[f"max_score_{k}"] = max([r["suspicion_score"] for r in regs], default=0.0)
            row[f"worst_clause_pos_{k}"] = meta.get("worst_pos", -1)
        n_hi = row["n_high_old"] + row["n_high_new"]
        n_me = row["n_medium_old"] + row["n_medium_new"]
        n_lo_pers = (row["n_regions_old"] + row["n_regions_new"]) - n_hi - n_me
        if any_heavy:
            st = "REVIEW_HEAVY"
        elif n_hi:
            st = "KEEP_MASKED"
        elif n_me:
            st = "REVIEW"
        elif n_lo_pers:
            st = "KEEP_NOTE"
        else:
            st = "KEEP"
        if "TOO_SHORT" in (row["status_old"], row["status_new"]) or "MISSING" in (row["status_old"], row["status_new"]):
            st = st if st != "KEEP" else "KEEP_UNANALYSED"
        row["qc_status"] = st
        tq_rows.append(row)

    reg_df = pd.DataFrame(regions)
    if reg_df.empty:
        reg_df = pd.DataFrame(columns=["transition_id", "version", "start_pos", "end_pos", "confidence"])
    else:
        reg_df.insert(0, "region_id", [f"R{i:05d}" for i in range(len(reg_df))])
    tq = pd.DataFrame(tq_rows)

    # clause-level mask file
    cq = df[["transition_id", "version", "clause_id", "pos"]].copy()
    cq["policy_sim"] = np.round(P, 3)
    cq["match_other_version"] = np.round(match_all, 3)
    cq["region_id"] = ""
    cq["region_confidence"] = ""
    cq["mask"] = False
    if len(reg_df):
        key = {(r.transition_id, r.version): [] for r in reg_df.itertuples()}
        for r in reg_df.itertuples():
            key[(r.transition_id, r.version)].append(r)
        for (tid, ver), rs in key.items():
            ix = np.sort(groups[(tid, ver)])
            for r in rs:
                sel = ix[r.start_pos:r.end_pos + 1]
                cq.iloc[sel, cq.columns.get_loc("region_id")] = r.region_id
                cq.iloc[sel, cq.columns.get_loc("region_confidence")] = r.confidence
                if r.confidence == "HIGH":
                    cq.iloc[sel, cq.columns.get_loc("mask")] = True
    return reg_df, tq, cq


# ----------------------------------------------------------------------------
# Review sample for manual validation
# ----------------------------------------------------------------------------
def build_validation_sample(df, reg_df, tq, cfg, n_med=40, n_low=30, n_pers=20, n_neg=100):
    rng = np.random.RandomState(cfg.seed)
    groups = df.groupby(["transition_id", "version"], sort=False).indices

    def view(tid, ver, s, e_, ctx=2):
        ix = np.sort(groups[(tid, ver)])
        lo, hi = max(0, s - ctx), min(len(ix), e_ + ctx + 1)
        out = []
        for k in range(lo, hi):
            mark = ">>" if s <= k <= e_ else "  "
            out.append(f"{mark}[{k}] {df['clause_text'].values[ix[k]][:220]}")
        return "\n".join(out)

    rows = []

    def add(tier, r):
        rows.append(dict(tier=tier, region_id=r.region_id, transition_id=r.transition_id, version=r.version,
                         start_pos=r.start_pos, end_pos=r.end_pos, confidence=r.confidence,
                         score=r.suspicion_score, evidence=r.evidence,
                         text_view=view(r.transition_id, r.version, r.start_pos, r.end_pos),
                         label="", notes=""))

    if len(reg_df):
        for tier, conf, k in [("HIGH", "HIGH", None), ("MEDIUM", "MEDIUM", n_med),
                              ("LOW", "LOW", n_low), ("PERSISTENT", "PERSISTENT", n_pers)]:
            sub = reg_df[reg_df.confidence == conf]
            if k is not None and len(sub) > k:
                sub = sub.sample(k, random_state=cfg.seed)
            for r in sub.itertuples():
                add(tier, r)
    neg = tq[tq.qc_status.isin(["KEEP", "KEEP_UNANALYSED"])]
    if len(neg) > n_neg:
        neg = neg.sample(n_neg, random_state=cfg.seed)
    for r in neg.itertuples():
        ver = "OLD" if rng.rand() < 0.5 else "NEW"
        k = getattr(r, f"worst_clause_pos_{ver.lower()}")
        if k < 0 or (r.transition_id, ver) not in groups:
            continue
        rows.append(dict(tier="NEGATIVE_SWEEP", region_id="", transition_id=r.transition_id, version=ver,
                         start_pos=k, end_pos=k, confidence="NONE", score=0, evidence="lowest policy-sim clause",
                         text_view=view(r.transition_id, ver, k, k, ctx=3), label="", notes=""))
    return pd.DataFrame(rows)


# ----------------------------------------------------------------------------
# Self-test: synthetic injection (recall) + hard negatives (false-positive HIGH)
# ----------------------------------------------------------------------------
FOREIGN = {
    "sports": ["Razorbacks edge rival in overtime thriller, 31-28.",
               "Quarterback throws for 312 yards as the Tigers advance to the playoffs.",
               "High school football scores: Central 21, Westside 14; Eastview 35, Northridge 7.",
               "Coach says injuries will not affect Saturday's lineup against the Wildcats.",
               "Recruiting roundup: three-star linebacker commits to the Hogs.",
               "Box score and highlights from last night's doubleheader."],
    "news": ["City council votes 5-2 to approve new downtown parking ordinance after heated debate.",
             "Police are investigating a two-vehicle crash on Highway 62 that left one person hospitalized.",
             "Local bakery celebrates 50 years in business with weekend street festival.",
             "Weather service predicts scattered thunderstorms and highs near 85 through Thursday.",
             "School board delays decision on budget cuts until next month's meeting.",
             "Obituaries: Margaret Ellis, 84, longtime teacher and church volunteer."],
    "nav": ["Home | News | Sports | Weather | Obituaries | Classifieds | Contact Us",
            "Subscribe to our newsletter | Print edition | Advertise with us | Careers",
            "Skip to main content Menu Search Sign In Subscribe Share on Facebook Tweet",
            "Related stories: Read more Next Previous Comments (14) Email Print",
            "Copyright 2014 All rights reserved. Sitemap RSS Help FAQ Register",
            "Top stories | Most read | Most commented | Photo galleries | Videos"],
    "other": ["Preheat the oven to 350 degrees and grease a nine-inch baking pan.",
              "The Dow closed up 112 points on strong earnings from retail stocks.",
              "Mix the flour, sugar and butter until the dough forms a crumbly texture.",
              "Sunrise 6:42 AM Sunset 7:58 PM Moon phase waxing crescent.",
              "Shares of the company rose 3.2 percent in after-hours trading on Tuesday.",
              "Click here to view today's crossword puzzle and daily horoscope."],
}


def selftest(df, E_unused, P_unused, cal, cfg, emb, base_tq, n=120):
    rng = np.random.RandomState(cfg.seed)
    clean = base_tq[base_tq.qc_status == "KEEP"].transition_id.tolist()
    if len(clean) < 2 * n:
        n = max(10, len(clean) // 2)
    pick = list(rng.choice(clean, size=min(len(clean), 2 * n), replace=False))
    pos_ids, neg_ids = pick[:n], pick[n:2 * n]
    parts, kinds = [], {}
    groups = df.groupby(["transition_id", "version"], sort=False).indices
    cats = list(FOREIGN)
    other_pool = {t: t for t in neg_ids}

    def clone(tid, suffix):
        sub = df[df.transition_id == tid].copy()
        sub["transition_id"] = f"{tid}__{suffix}"
        return sub

    def insert(sub, ver, texts, where):
        v = sub[sub.version == ver]
        rest = sub[sub.version != ver]
        k = {"start": 0, "mid": len(v) // 2, "end": len(v)}[where]
        newrows = []
        for t in texts:
            r = v.iloc[0].copy()
            r["clause_text"] = t
            r["clause_id"] = f"INJ{rng.randint(10**9)}"
            newrows.append(r)
        v2 = pd.concat([v.iloc[:k], pd.DataFrame(newrows), v.iloc[k:]])
        return pd.concat([rest, v2])

    for i, tid in enumerate(pos_ids):
        cat = cats[i % len(cats)]
        texts = list(rng.choice(FOREIGN[cat], size=4, replace=False))
        where = ["start", "mid", "end"][i % 3]
        persistent = i % 5 == 0
        sub = clone(tid, f"POS{'P' if persistent else 'S'}_{cat}")
        sub = insert(sub, "OLD", texts, where)
        if persistent:
            sub = insert(sub, "NEW", texts, where)
        kinds[sub.transition_id.iloc[0]] = "persistent_pos" if persistent else "single_pos"
        parts.append(sub)
    for i, tid in enumerate(neg_ids):
        donor = neg_ids[(i + 7) % len(neg_ids)]
        dv = df[(df.transition_id == donor) & (df.version == "OLD")]
        if len(dv) < 12:
            continue
        a = rng.randint(0, len(dv) - 5)
        texts = dv["clause_text"].values[a:a + 4].tolist()
        sub = clone(tid, "NEG")
        sub = insert(sub, "OLD", texts, ["start", "mid", "end"][i % 3])
        kinds[sub.transition_id.iloc[0]] = "hard_neg"
        parts.append(sub)

    t = pd.concat(parts, ignore_index=True)
    t["_row"] = np.arange(len(t))
    t["pos"] = t.groupby(["transition_id", "version"], sort=False).cumcount()
    t = add_clause_features(t, cfg)
    Et, Pt = add_embedding_features(t, emb, cfg)
    reg, tq, _ = run_pipeline(t.reset_index(drop=True), Et, Pt, cal, cfg)
    res = {}
    for tid, kind in kinds.items():
        rs = reg[(reg.transition_id == tid) & (reg.version == "OLD")] if len(reg) else reg
        inj = t[(t.transition_id == tid) & t.clause_id.astype(str).str.startswith("INJ") & (t.version == "OLD")].pos
        if len(inj):
            lo, hi = inj.min(), inj.max()
            rs = rs[(rs.start_pos <= hi) & (rs.end_pos >= lo)] if len(rs) else rs
        confs = set(rs.confidence) if len(rs) else set()
        res.setdefault(kind, []).append(confs)

    def rate(kind, pred):
        L = res.get(kind, [])
        return (sum(pred(c) for c in L) / len(L), len(L)) if L else (float("nan"), 0)

    print("\n=== SELFTEST (synthetic; recall is optimistic - injected text is blatantly foreign) ===")
    r, k = rate("single_pos", lambda c: "HIGH" in c)
    print(f"single-version injection : HIGH recall {r:.2%} (n={k})")
    r, _ = rate("single_pos", lambda c: bool(c & {"HIGH", "MEDIUM"}))
    print(f"single-version injection : >=MEDIUM recall {r:.2%}")
    r, k = rate("persistent_pos", lambda c: "PERSISTENT" in c)
    print(f"both-version injection   : classified PERSISTENT {r:.2%} (n={k})")
    r, k = rate("hard_neg", lambda c: "HIGH" in c)
    print(f"hard negatives (real policy clauses from another site): HIGH false-positive {r:.2%} (n={k})")
    r, _ = rate("hard_neg", lambda c: bool(c & {"HIGH", "MEDIUM"}))
    print(f"hard negatives: >=MEDIUM false-positive {r:.2%}")


# ----------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default="segmented_policy_clauses.csv")
    ap.add_argument("--outdir", default="qc_out")
    ap.add_argument("--domain-col", default="domain", help="column holding the ~13 broad domains")
    ap.add_argument("--no-embeddings", action="store_true")
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()
    cfg = Config()
    os.makedirs(a.outdir, exist_ok=True)

    df = load_clauses(a.input, a.domain_col)
    print(f"rows={len(df):,} transitions={df.transition_id.nunique():,}")
    df = add_clause_features(df, cfg)
    emb = Embedder(cfg, use_embeddings=not a.no_embeddings, cache_dir=os.path.join(a.outdir, "cache"))
    print(f"embedding mode: {emb.mode}")
    E, P = add_embedding_features(df, emb, cfg)
    cal = calibrate(df, P, cfg)
    print(f"calibration: global tau={cal['global_tau']:.3f} scale={cal['scale']:.3f}")

    reg, tq, cq = run_pipeline(df, E, P, cal, cfg)
    reg.to_csv(os.path.join(a.outdir, "contamination_regions.csv"), index=False, encoding="utf-8-sig")
    tq.to_csv(os.path.join(a.outdir, "transition_qc.csv"), index=False, encoding="utf-8-sig")
    cq.to_csv(os.path.join(a.outdir, "clause_qc.csv"), index=False, encoding="utf-8-sig")
    build_validation_sample(df, reg, tq, cfg).to_csv(
        os.path.join(a.outdir, "qc_validation_sample.csv"), index=False, encoding="utf-8-sig")
    with open(os.path.join(a.outdir, "qc_config.json"), "w") as f:
        json.dump({"config": asdict(cfg), "embedding_mode": emb.mode,
                   "calibration": cal, "anchors": POLICY_ANCHORS}, f, indent=2)

    print("\nregions by confidence:\n", reg["confidence"].value_counts().to_string() if len(reg) else "none")
    print("\ntransition qc_status:\n", tq["qc_status"].value_counts().to_string())
    print(f"\nclauses masked (HIGH only): {int(cq['mask'].sum()):,} of {len(cq):,}")
    if a.selftest:
        selftest(df, E, P, cal, cfg, emb, tq)


if __name__ == "__main__":
    main()
