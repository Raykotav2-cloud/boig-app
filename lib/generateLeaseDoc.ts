import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
} from "docx";

const LANDLORD_NAME = "Mirtha Ortega / Mariam Berthet";
const LANDLORD_EMAIL = "berthetortegainvestmentgroup@yahoo.com";
const LANDLORD_PHONE = "786-479-5448";

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function p(text: string, opts: any = {}) {
  return new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text, ...opts })] });
}

function bp(label: string, rest: string) {
  return new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun({ text: label, bold: true }), new TextRun({ text: rest })],
  });
}

export async function generateLeaseDocx(contract: any) {
  const property = contract.properties;
  const tenant = contract.tenants;
  const paymentLabel: Record<string, string> = { cash: "cash", zelle: "Zelle", other: "other" };

  const header = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: "5B7FB4" },
            borders: {
              top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
            },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "BERTHET-ORTEGA INVESTMENT GROUP", bold: true, color: "FFFFFF", size: 22 })],
            })],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 } } },
      children: [
        header,
        new Paragraph({ spacing: { before: 300, after: 300 }, alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Residential Lease", bold: true, size: 24 })] }),

        p("1. PARTIES. ", { bold: true }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({ text: `This is a Residential Lease (the "Lease") between ` }),
            new TextRun({ text: tenant?.full_name ?? "", bold: true }),
            new TextRun({ text: ` (hereinafter referred to as "Tenant"), and ` }),
            new TextRun({ text: LANDLORD_NAME, bold: true }),
            new TextRun({ text: ` (hereinafter referred to as "Landlord"), as a second party, and enter into this Residential Lease pursuant to the following terms:` }),
          ],
        }),
        bp("Landlord's E-mail address: ", LANDLORD_EMAIL),
        bp("Landlord's Telephone Number: ", LANDLORD_PHONE),
        bp("Tenant's E-mail address: ", tenant?.email ?? ""),
        bp("Tenant's Telephone Number: ", tenant?.phone ?? ""),

        p("2. PROPERTY RENTED. ", { bold: true }),
        new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({ text: "Landlord leases to Tenant the land and buildings located at: " }),
            new TextRun({ text: `${property?.name ?? ""} — ${property?.address ?? ""}`, bold: true, underline: {} }),
          ],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({ text: "together with the following furniture and appliances: " }),
            new TextRun({ text: property?.appliances || "N/A", bold: true, underline: {} }),
          ],
        }),
        p("The Premises shall be occupied only by the Tenant and approved family ONLY."),

        p("3. TERM. ", { bold: true }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({ text: 'This is a lease for a term not to exceed One ("1") year beginning on ' }),
            new TextRun({ text: fmtDate(contract.start_date), bold: true }),
            new TextRun({ text: ", and ending on " }),
            new TextRun({ text: contract.end_date ? fmtDate(contract.end_date) : "N/A", bold: true }),
            new TextRun({ text: ' (the "Lease Term").' }),
          ],
        }),

        p("4. RENT PAYMENTS, TAXES AND CHARGES. ", { bold: true }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({ text: "Tenant shall pay rent monthly, on the 1st day of each month, in the amount of " }),
            new TextRun({ text: `$${Number(contract.monthly_rent).toLocaleString()}`, bold: true, underline: {} }),
            new TextRun({ text: " per installment." }),
          ],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({ text: 'All rent payments shall be payable to "' }),
            new TextRun({ text: contract.payable_to || "Berthet-Ortega Investment Group", underline: {} }),
            new TextRun({ text: '".' }),
          ],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({ text: `Tenant shall make rent payments required under the Lease by ${paymentLabel[contract.payment_method] ?? "Zelle"}. No checks of any kind will be accepted. If payment is accepted by any means other than cash, payment is not considered made until the other instrument is collected.` }),
          ],
        }),
        contract.deposit
          ? new Paragraph({
              spacing: { after: 200 },
              children: [
                new TextRun({ text: "Security deposit: " }),
                new TextRun({ text: `$${Number(contract.deposit).toLocaleString()}`, bold: true }),
              ],
            })
          : p(""),

        new Paragraph({ spacing: { before: 600, after: 200 },
          children: [new TextRun({ text: "Signatures", bold: true, size: 22 })] }),
        new Paragraph({ spacing: { before: 400, after: 100 },
          children: [new TextRun({ text: "_______________________________" })] }),
        p("Landlord — Berthet-Ortega Investment Group    Date: ______________"),
        new Paragraph({ spacing: { before: 400, after: 100 },
          children: [new TextRun({ text: "_______________________________" })] }),
        p(`Tenant — ${tenant?.full_name ?? ""}    Date: ______________`),
      ],
    }],
  });

  return Packer.toBlob(doc);
}
