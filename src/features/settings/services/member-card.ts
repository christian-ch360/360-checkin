export type MemberCardData = {
  fullName: string;
  memberNumber: string;
  role: string;
  tierCode?: string | null;
  organizationName: string;
  qrToken: string;
};

async function qrImageDataUrl(token: string): Promise<string> {
  const res = await fetch(`/api/qr/${token}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Renders a CR80 (standard ID card, 85.6 x 54mm) badge client-side and
 * triggers a browser download. Runs in the browser — jsPDF is isomorphic —
 * so the QR PNG served at /api/qr/[token] can be fetched same-origin and
 * embedded directly, no server round-trip needed. jsPDF is a large library
 * (it was ~150kB of the Settings page's First Load JS on its own), so it's
 * dynamically imported here rather than at module scope — only downloaded
 * once someone actually clicks "Download Member Card."
 */
export async function downloadMemberCard(data: MemberCardData) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [85.6, 54] });

  doc.setFillColor(15, 23, 21);
  doc.rect(0, 0, 85.6, 54, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(data.organizationName, 6, 8);

  doc.setFontSize(12);
  doc.text(data.fullName, 6, 20);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 210, 208);
  doc.text(data.role.replaceAll("_", " "), 6, 26);
  doc.text(data.memberNumber, 6, 31);
  if (data.tierCode) doc.text(`Tier ${data.tierCode}`, 6, 36);

  try {
    const qr = await qrImageDataUrl(data.qrToken);
    doc.addImage(qr, "PNG", 58, 8, 22, 22);
  } catch {
    // QR image failed to load — still deliver a usable card with the text side.
  }

  doc.save(`${data.fullName.replace(/\s+/g, "-").toLowerCase()}-member-card.pdf`);
}
