from sklearn.cluster import KMeans
import numpy as np
import pandas as pd
from collections import defaultdict

# Suppose X = np.vstack([...]) and roles = [...]
astronauts = pd.read_pickle(r"C:\Users\ltkie\OneDrive\Documents\UNC\Fall25\CDC25\Model\Data Analysis\astronauts_with_roles.pkl")
X = np.vstack(astronauts['embedding_concat'])
roles = astronauts['roles'].tolist()

# Choose number of clusters ~ number of distinct roles
k = len(set(roles))

kmeans = KMeans(n_clusters=k, random_state=42)
labels = kmeans.fit_predict(X)

# Map cluster -> roles in it (for inspection)
cluster_roles = defaultdict(list)
for lbl, role in zip(labels, roles):
    cluster_roles[lbl].append(role)

for c, r in cluster_roles.items():
    print(f"Cluster {c}: {set(r)}")