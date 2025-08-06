---
title:  "Biodiversity Data Publishing"
date:   2025-07-10
## categories: ["Getting started", "Jekyll"]
lang-ref: for authors
background: assets/images/BDP.png
---
Know more about biodiversity data publishing

Read more in the "(https://classroom.google.com/c/NzY5NTIzMzMxODIw?cjc=7ohd2ppb)"


# Export Page to PDF Example

Click the button below to export this page to PDF.

<button id="exportPDF">Export to PDF</button>

<!-- Add jsPDF and html2pdf.js -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>

<script>
document.getElementById('exportPDF').addEventListener('click', function () {
    const element = document.body; // Change this to a specific div if you want only part of the page
    const opt = {
        margin:       0.5,
        filename:     'page-export.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
});
</script>
