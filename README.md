SneakyToS



Detecting Permission-Expanding Changes in Evolving Privacy Policies Through Temporal Semantic Analysis



Problem



Privacy Policies and Terms of Service are frequently updated. Most users do not read these updates, and conventional document-diff tools identify textual changes without explaining whether those changes expand the permissions available to a company.



SneakyToS treats policy evolution as a temporal semantic permission-delta problem.



Objective



Given two versions of a Privacy Policy, the system:



Segments the documents into clauses.

Semantically aligns corresponding clauses.

Detects substantive changes.

Classifies changes as cosmetic, permission-expanding, permission-restricting, or neutral.

Extracts permission-related information.

Identifies the semantic permission delta.

Generates a plain-language explanation.

Initial Scope



The first version focuses on:



Data Collection

Data Use

Data Analysis

Data Sharing

Data Transfer

Data Retention

