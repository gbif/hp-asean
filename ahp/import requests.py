import requests


url = "https://dashboard.aseanbiodiversity.org/api/species"
res = requests.get(url)
data = res.json()
