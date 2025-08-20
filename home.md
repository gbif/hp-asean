---
lang-ref: home 
layout: home
title: ASEAN Centre for Biodiversity
description: The ASEAN Centre for Biodiversity Species Occurrences Collections
background: /assets/images/Ari Kustiawan_Coconut Rhinoceros Beetle.jpg
imageLicense: |
  Photo by Ari Kustiawan_Coconut Rhinoceros Beetle
klass: home
permalink: /
composition:
  - type: blank
    data: home.main
  - type: stats
    data: home.stats
  - type: blank
    data: home.blueprint_with_video
  - type: latestPosts
    data: home.latest
    height: 25vh
  - type: dashboard
    data: examples.dashboard
---

Here’s a random image on each refresh:

<div id="random-image"></div>

<script>
  // Load images from Jekyll YAML
  const images = [
    {% for img in site.data.images.images %}
      "{{ img }}"{% unless forloop.last %},{% endunless %}
    {% endfor %}
  ];

  // Pick random image
  const randomImage = images[Math.floor(Math.random() * images.length)];

  // Render it
  document.getElementById("random-image").innerHTML =
    `<img src="${randomImage}" alt="Random Image" style="max-width:100%;border-radius:8px;">`;
</script>
