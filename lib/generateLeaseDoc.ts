import {
  Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, Footer, PageNumber,
} from "docx";

// ------------------------------------------------------------------
// Landlord details and standing lease terms.
// Edit these values here and every generated lease picks them up.
// ------------------------------------------------------------------
const LANDLORD_NAME = "Mirtha Ortega / Mariam Berthet";
const LANDLORD_SIGNERS = "MARIAM BERTHET and MIRTHA ORTEGA";
const LANDLORD_COMPANY = "Berthet Ortega Investment Group";
const LANDLORD_EMAIL = "berthetortegainvestmentgroup@yahoo.com";
const LANDLORD_PHONE = "786-479-5448";
const NOTICE_ADDRESS = ["Mirtha Ortega and Mariam Berthet", "12921 SW 52 Street", "Southwest Ranches, Fl. 33330"];
const LATE_FEE_INITIAL = 50;      // charged after the grace period
const LATE_FEE_DAILY = 35;        // per additional day
const LATE_FEE_CAP = 260;         // maximum per month
const LATE_FEE_GRACE_DAYS = 3;
const TENANT_REPAIR_LIMIT = 250;  // repairs at or below this amount are the tenant's
const KEY_SETS = 2;
const MAX_POOL_GUESTS = 3;

// Who maintains what. Mirrors the Section 12 checklist of the signed lease.
const MAINTENANCE_ITEMS: [string, string][] = [
  ["Roofs", "LANDLORD"],
  ["Doors", "LANDLORD"],
  ["Foundations", "LANDLORD"],
  ["Heating", "LANDLORD"],
  ["Electrical system", "LANDLORD"],
  ["Garbage removal / outside receptacles; extermination of rats, mice, roaches, ants and bedbugs; extermination of wood-destroying organisms", "LANDLORD"],
  ["Screens, porches and structural components", "LANDLORD"],
  ["Running water", "LANDLORD"],
  ["Cooling", "LANDLORD (except for HVAC filters, which TENANT shall change on a monthly basis)"],
  ["Steps; exterior walls", "LANDLORD"],
  ["Locks and keys", "LANDLORD"],
  ["Smoke detection devices", "LANDLORD"],
  ["Windows, floors, plumbing, hot water", "LANDLORD"],
  ["Landscaping and lawn care (rear)", "TENANT"],
  ["Clean, sanitary interior and exterior premises", "TENANT"],
];

const ORDINALS = [
  "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth",
  "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth", "Sixteenth", "Seventeenth",
  "Eighteenth", "Nineteenth", "Twentieth", "Twenty-first", "Twenty-second", "Twenty-third", "Twenty-fourth",
];

const NUMBER_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function usd(n: number) {
  return "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ordinalDay(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Whole months covered by the lease term, inclusive of the first month.
function termMonths(start: string, end: string | null) {
  if (!end) return 12;
  const a = new Date(start + "T00:00:00");
  const b = new Date(end + "T00:00:00");
  const months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  return Math.max(1, months + 1);
}

// ---------- paragraph helpers ----------
function p(text: string, opts: any = {}) {
  const { spacing, align, ...run } = opts;
  return new Paragraph({
    spacing: spacing ?? { after: 200 },
    alignment: align ?? AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, ...run })],
  });
}

// Numbered clause heading followed by its body text in the same paragraph.
function clause(heading: string, body: string) {
  return new Paragraph({
    spacing: { after: 200 },
    alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text: heading, bold: true }), new TextRun({ text: body })],
  });
}

// Heading + body where parts of the body are filled in from the app.
function clauseRuns(heading: string, runs: TextRun[]) {
  return new Paragraph({
    spacing: { after: 200 },
    alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text: heading, bold: true }), ...runs],
  });
}

function fill(text: string) {
  return new TextRun({ text, bold: true, underline: {} });
}

function indented(text: string, bold = false) {
  return new Paragraph({
    spacing: { after: 100 }, indent: { left: 480 },
    alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, bold })],
  });
}

export async function generateLeaseDocx(contract: any) {
  const property = contract.properties;
  const tenant = contract.tenants;

  // Contracts hold one tenant; `co_tenants` carries any additional names typed on the lease form.
  const tenantNames = [tenant?.full_name, contract.co_tenants].filter(Boolean).join(" and ") || "________________";

  const rent = Number(contract.monthly_rent) || 0;
  const deposit = Number(contract.deposit) || 0;
  const months = termMonths(contract.start_date, contract.end_date);
  const totalRent = rent * months;
  const earlyTerminationFee = rent * 2;
  const payDay = Number(contract.payment_day) || 1;
  const method = String(contract.payment_method || "zelle").toLowerCase();
  const box = (m: string) => (method === m ? "[x]" : "[ ]");

  // Payment schedule: one installment per month from the lease start date.
  const start = new Date(contract.start_date + "T00:00:00");
  const schedule = Array.from({ length: months }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth() + i, payDay);
    const label = i === months - 1 ? "Final payment" : `${ORDINALS[i] ?? `${i + 1}th`} Payment`;
    return `${label} ${usd(rent)} on ${d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
  });

  // Letterhead: centred type over a hairline rule — no shaded box.
  const header = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: "BERTHET-ORTEGA INVESTMENT GROUP", bold: true, size: 24, characterSpacing: 30 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: "Imagine  ·  Invest  ·  Improve", size: 16, italics: true, color: "767676" })],
    }),
    new Paragraph({
      spacing: { after: 360 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "5B7FB4", space: 6 } },
      children: [new TextRun({ text: "" })],
    }),
  ];

  const signatureBlock = (label: string) => [
    new Paragraph({ spacing: { before: 400, after: 120 }, children: [new TextRun({ text: `${label} PRINT: _________________________________________` })] }),
    p("SIGNATURE: _________________________________", { spacing: { after: 120 } }),
    p("DATE: ____________", { spacing: { after: 300 } }),
  ];

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Times New Roman", size: 22 },
          paragraph: { spacing: { line: 276 } },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({
              children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES],
              size: 16, color: "767676",
            })],
          })],
        }),
      },
      children: [
        ...header,
        new Paragraph({
          spacing: { before: 300, after: 300 }, alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Residential Lease", bold: true, size: 24 })],
        }),

        // 1
        clauseRuns("1. PARTIES. ", [
          new TextRun({ text: 'This is a Residential Lease (the "Lease") between ' }),
          fill(tenantNames),
          new TextRun({ text: ' as a first party (hereinafter collectively referred to as "Tenant"), and ' }),
          new TextRun({ text: LANDLORD_NAME, bold: true }),
          new TextRun({ text: ' (hereinafter referred to as "Landlord"), as a second party, and enter into this Residential Lease pursuant to the following terms:' }),
        ]),
        p(`Landlord's E-mail address: ${LANDLORD_EMAIL}`, { spacing: { after: 100 } }),
        p(`Landlord's Telephone Number: ${LANDLORD_PHONE}`, { spacing: { after: 100 } }),
        p(`Tenant's E-mail address: ${tenant?.email || "________________"}`, { spacing: { after: 100 } }),
        p(`Tenant's Telephone Number: ${tenant?.phone || "________________"}`),

        // 2
        clauseRuns("2. PROPERTY RENTED. ", [
          new TextRun({ text: "Landlord leases to Tenant the land and buildings located at: " }),
          fill(property?.address ?? ""),
          new TextRun({ text: " together with the following furniture and appliances: " }),
          fill(property?.appliances || "N/A"),
          new TextRun({ text: " (which are all fully functional)." }),
        ]),
        p("The Premises shall be occupied only by the Tenant and approved family ONLY."),

        // 3
        clauseRuns("3. TERM. ", [
          new TextRun({ text: `This is a lease for a term not to exceed ${NUMBER_WORDS[Math.round(months / 12)] ?? Math.round(months / 12)} ("${Math.round(months / 12)}") year beginning on ` }),
          fill(fmtDate(contract.start_date)),
          new TextRun({ text: ", and ending on " }),
          fill(contract.end_date ? fmtDate(contract.end_date) : "________________"),
          new TextRun({ text: ' (the "Lease Term").' }),
        ]),

        // 4
        clauseRuns("4. RENT PAYMENTS, TAXES AND CHARGES. ", [
          new TextRun({ text: "Tenant shall pay total rent in the amount of " }),
          fill(usd(totalRent)),
          new TextRun({ text: " for the Lease Term. The rent shall be payable by Tenant in monthly installments. Rent shall be payable monthly, on the " }),
          fill(ordinalDay(payDay)),
          new TextRun({ text: ' day of each month, beginning on the first month as more fully described in Section 6 of this Lease titled "Payment Schedule," in the amount of ' }),
          fill(usd(rent)),
          new TextRun({ text: " per installment." }),
        ]),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({ text: "All rent payments shall be payable to " }),
            fill(contract.payable_to || LANDLORD_COMPANY),
            new TextRun({ text: "." }),
          ],
        }),
        p(`Tenant shall make rent payments required under the Lease by (choose all applicable) ${box("cash")} cash, ${box("zelle")} Zelle or ${box("other")} other ______________ (specify). No checks of any kind will be accepted. If payment is accepted by any means other than cash, payment is not considered made until the other instrument is collected.`),

        // 5
        clause("5. MONEY DUE PRIOR TO OCCUPANCY. ", "Any funds designated in this paragraph due after occupancy shall be paid accordingly. Any funds due under this paragraph shall be payable to Landlord."),
        indented(`First month's rent: ${usd(rent)} due on or before ${fmtDate(contract.start_date)}; and`),
        indented(`Security Deposit in the total amount of ${usd(deposit)} (due on or before ${fmtDate(contract.start_date)}, to be returned upon final inspection).`),

        // 6
        clause("6. PAYMENT SCHEDULE. ", "Tenant shall pay Rent to Landlord pursuant to the following schedule:"),
        ...schedule.map((line) => indented(line)),

        // 7
        clause("7. SECURITY DEPOSITS AND ADVANCED RENT. ", "If Tenant has paid a security deposit or advance rent, the following provisions apply:"),
        p("Landlord shall hold the money in a separate interest-bearing or non-interest-bearing account in a Florida banking institution for the benefit of the Tenant. If Landlord deposits the money in an interest-bearing account, Landlord must pay Tenant interest of at least 75% of the annualized average interest paid by the bank or 5% per year simple interest, whichever Landlord chooses. Landlord cannot mix such money with any other funds of Landlord or pledge, mortgage, or make any other use of such money until the money is actually due to Landlord; or"),
        p("Landlord must post a surety bond in the manner allowed by law. If Landlord posts the bond, Landlord shall pay Tenant 5% interest per year."),
        p("Within fifteen (15) days after Tenant has vacated the premises, returned keys, and provided Landlord with a forwarding address, Landlord will give Tenant an itemized written statement of the reasons for, and the dollar amount of, any of the security deposit retained by Landlord, along with a check for any deposit balance. At the end of the Lease, Landlord will pay Tenant, or credit against rent, the interest due to Tenant. No interest will be due Tenant if Tenant wrongfully terminates the Lease before the end of the Lease Term."),
        p("If Landlord rents 5 or more dwelling units, then within 30 days of Tenant's payment of the advance rent or any security deposit, Landlord must notify Tenant in writing of the manner in which Landlord is holding such money, the interest rate, if any, that Tenant will receive, and when such payments will be made."),

        // 8
        clause("8. LATE FEES. ", `In addition to rent, Tenant shall pay a late charge in the amount of ${usd(LATE_FEE_INITIAL)} for each rent payment made three (${LATE_FEE_GRACE_DAYS}) calendar days after the day it is due (e.g., any rent payment received after the ${ordinalDay(payDay + LATE_FEE_GRACE_DAYS)} day of each month) plus ${usd(LATE_FEE_DAILY)} for each additional day that the rent remains unpaid. The total late charge for any one month will not exceed ${usd(LATE_FEE_CAP)}. Landlord does not waive the right to insist on payment of the rent in full on the date it is due.`),

        // 9
        clause("9. PETS AND SMOKING. ", "Tenants may NOT keep pets or animals on the Premises. No smoking will be allowed inside the Premises."),

        // 10
        clause("10. NOTICES. ", "All notices of such names and addresses or changes thereto shall be delivered to the Tenant's residence or, if specified in writing by the Tenant, to any other address. All notices to the Landlord shall be given by U.S. Certified Mail or by hand delivery to:"),
        ...NOTICE_ADDRESS.map((line) => indented(line, true)),
        p("Any notice to Tenant shall be given by U.S. mail or delivered to Tenant at the Premises. If Tenant is absent from the Premises, a notice to Tenant may be given by leaving a copy of the notice at the Premises. In case of dispute, all correspondence must be delivered by certified mail by both parties to the last known address of each party."),

        // 11
        clause("11. UTILITIES. ", "Landlord will pay for all utility services during the Lease Term and connection charges and deposits for activating existing utility connections to the Premises, except that Tenant shall pay for the following utilities:"),
        indented("________________________________________________"),

        // 12
        clause("12. MAINTENANCE. ", "Landlord shall be responsible for compliance with Section 83.51, Florida Statutes, and shall be responsible for maintenance and repair of the Premises, unless otherwise stated below:"),
        ...MAINTENANCE_ITEMS.map(([item, who]) =>
          new Paragraph({
            spacing: { after: 80 }, indent: { left: 480 },
            children: [new TextRun({ text: `${item}: ` }), new TextRun({ text: who, bold: true })],
          })
        ),
        p(`Notwithstanding the foregoing, Tenant shall notify Landlord of maintenance and repair requests in excess of ${usd(TENANT_REPAIR_LIMIT)}. Any and all maintenance and repair requests requiring repairs less than or equal to ${usd(TENANT_REPAIR_LIMIT)} shall be the responsibility of the Tenant to repair.`, { spacing: { before: 200, after: 200 } }),
        p("Tenant shall reimburse Landlord, on demand by Landlord, for the cost of any repairs to the premises damaged by Tenant or Tenant's guests or business invitees through misuse or neglect."),
        p("Tenant shall immediately notify Landlord of any defects or dangerous conditions in and about the premises of which Tenant becomes aware."),
        p("The Landlord covenants to provide and maintain the Premises in a good state of repair, and the Tenant agrees to keep the Premises in a reasonable state of cleanliness, to assume all responsibilities for the repair of damages caused by his/her willful or negligent conduct, or that of persons who are permitted on the Premises by him/her; and the Tenant further agrees not to make, or carry out, any major improvements without first obtaining the Landlord's approval in writing."),

        // 13
        clause("13. ASSIGNMENT. ", "Tenant may not assign the Lease or sublease all or any part of the Premises without first obtaining the Landlord's written approval and consent to the assignment or sublease."),

        // 14
        clause("14. KEYS AND LOCKS. ", `Landlord shall furnish Tenant ${KEY_SETS} set(s) of keys to the dwelling and common area premises. At the end of the Lease Term, all items specified in this paragraph shall be returned to Landlord.`),

        // 15
        clause("15. SERVICEMEMBER. ", "If Tenant is a member of the United States Armed Forces on active duty or state active duty, or a member of the Florida National Guard or United States Reserve Forces, the Tenant has rights to terminate the Lease as provided in Section 83.682, Florida Statutes, the provisions of which can be found in the attachment to this Lease."),

        // 16
        clause("16. LANDLORD'S ACCESS TO THE PREMISES. ", "Landlord's Agent may enter the Premises in the following circumstances:"),
        indented("At any time for the protection or preservation of the Premises;"),
        indented("After reasonable notice to Tenant at reasonable times for the purpose of repairing the Premises;"),
        indented("To inspect the Premises; make necessary or agreed-upon repairs, decorations, alterations or improvements; supply agreed services; or exhibit the Premises to prospective or actual purchasers, mortgagees, tenants, workers or contractors, under any of the following circumstances by giving Tenant 48 hours' written notice: with Tenant's consent; in case of emergency; when Tenant unreasonably withholds consent; or if Tenant is absent from the Premises for a period of at least one-half a rental installment period."),

        // 17
        clause("17. HOMEOWNER'S ASSOCIATION. ", 'IF TENANT MUST BE APPROVED BY A HOMEOWNER\'S ASSOCIATION ("ASSOCIATION"), LANDLORD AND TENANT AGREE THAT THE LEASE IS CONTINGENT UPON RECEIVING APPROVAL FROM THE ASSOCIATION. ANY APPLICATION FEE REQUIRED BY AN ASSOCIATION SHALL BE PAID BY [ ] LANDLORD [ ] TENANT. IF SUCH APPROVAL IS NOT OBTAINED PRIOR TO COMMENCEMENT OF THE LEASE TERM, EITHER PARTY MAY TERMINATE THE LEASE BY WRITTEN NOTICE TO THE OTHER GIVEN AT ANY TIME PRIOR TO APPROVAL BY THE ASSOCIATION, AND IF THE LEASE IS TERMINATED, TENANT SHALL RECEIVE RETURN OF DEPOSITS SPECIFIED IN ARTICLE 5, IF MADE.'),
        p("If the Lease is not terminated, rent shall abate until the approval is obtained from the association. Tenant agrees to use due diligence in applying for association approval and to comply with the requirements for obtaining approval. [ ] Landlord [ ] Tenant shall pay the security deposit required by the association, if applicable."),

        // 18
        clause("18. USE OF THE PREMISES. ", `Tenant shall use the Premises for residential purposes. Tenant shall have exclusive use and right of possession to the dwelling. The Premises shall be used so as to comply with all state, county and municipal laws and ordinances, and all covenants and restrictions affecting the Premises and all rules and regulations of homeowners' associations affecting the Premises. Tenant may not paint or make any alterations or improvements to the Premises without first obtaining the Landlord's written consent to the alteration or improvement. However, unless this box [ ] is checked, Tenant may hang pictures and install window treatments in the Premises without Landlord's consent, provided Tenant removes all such items before the end of the Lease Term and repairs all damage resulting from the removal. Any improvements or alterations to the Premises made by the Tenant shall become Landlord's property. Tenant agrees not to use, keep or store on the Premises any dangerous, explosive or toxic material which would increase the probability of fire or which would increase the cost of insuring the Premises. In addition, Tenant shall abide by all Homeowner Association rules and regulations, including not allowing more than ${MAX_POOL_GUESTS} guests in the pool area at a time. Under no circumstances shall pets be allowed in the pool area or in the leased premises.`),

        // 19
        clause("19. VEHICLE PARKING. ", "Tenant shall have access to the front portion of the house to use parking spaces. Said parking spaces are to be used for parking personal vehicles only and, accordingly, the parking of trailers, boats or commercial vehicles is strictly prohibited."),

        // 20
        clause("20. RISK OF LOSS / INSURANCE. ", "Landlord and Tenant shall each be responsible for loss, damage or injury caused by its own negligence or willful conduct. Tenant should carry insurance covering Tenant's personal property and Tenant's liability insurance."),

        // 21
        clause("21. PROHIBITED ACTS BY LANDLORD. ", "Landlord is prohibited from taking certain actions as described in Section 83.67, Florida Statutes, the provisions of which can be found in the attachment to this Lease."),

        // 22
        clause("22. CASUALTY DAMAGE. ", "If the Premises are damaged or destroyed other than by wrongful or negligent acts of Tenant or persons on the Premises with Tenant's consent, so that the use of the Premises is substantially impaired, Tenant may terminate the Lease within 30 days after the damage or destruction and Tenant will immediately vacate the Premises. If Tenant vacates, Tenant is not liable for rent that would have been due after the date of termination. Tenant may vacate the part of the Premises rendered unusable by the damage or destruction, in which case Tenant's liability for rent shall be reduced by the fair rental value of the part of the Premises that was damaged or destroyed."),

        // 23
        clause("23. DEFAULTS / REMEDIES. ", "Should a party to the Lease fail to fulfill their responsibilities under the Lease, or need to determine whether there has been a default of the Lease, refer to Part II, Chapter 83, entitled Florida Residential Landlord and Tenant Act, which contains information on defaults and remedies. A copy of the current version of this Act is attached to the Lease."),
        p("In addition, in the event Tenant defaults on the timely payment of monthly rent, Landlord may impose a claim against the security deposit for damages caused by Tenant's failure to pay rent, in addition to all other damages allowed by Florida law."),

        // 24
        clause("24. SUBORDINATION. ", "The Lease is automatically subordinate to the lien of any mortgage encumbering the fee title to the Premises from time to time."),

        // 25
        clause("25. LIENS. ", "THE INTEREST OF THE LANDLORD SHALL NOT BE SUBJECT TO LIENS FOR IMPROVEMENTS MADE BY THE TENANT AS PROVIDED IN SECTION 713.10, FLORIDA STATUTES. Tenant shall notify all parties performing work on the Premises at Tenant's request that the Lease does not allow any liens to attach to Landlord's interest."),

        // 26
        clause("26. RENEWAL / EXTENSION. ", "The Lease can be renewed or extended only by a written agreement signed by both Landlord and Tenant. A new lease is required for each term. In addition, in the event Tenant wishes not to renew this Lease Agreement, Tenant agrees to give Landlord at least 30 days' prior notice from the date of lease termination."),

        // 27
        clause("27. TENANT'S TELEPHONE NUMBER. ", "Tenant shall, within 5 business days of obtaining telephone service at the Premises, send written notice to Landlord of Tenant's telephone numbers at the Premises."),

        // 28
        clause("28. ATTORNEYS' FEES. ", "In any lawsuit brought to enforce the Lease or under applicable law, the party in whose favor a judgment or decree has been rendered may recover reasonable court costs, including attorneys' fees, from the non-prevailing party."),

        // 29
        clause("29. MISCELLANEOUS. ", "Time is of the essence of the performance of each party's obligations under the Lease."),
        p("The Lease shall be binding upon and for the benefit of the heirs, personal representatives, successors and permitted assigns of Landlord and Tenant, subject to the requirements specifically mentioned in the Lease. Whenever used, the singular number shall include the plural or singular and the use of any gender shall include all appropriate genders."),
        p("The agreements contained in the Lease set forth the complete understanding of the parties and may not be changed or terminated orally."),
        p("No agreement to accept surrender of the Premises from Tenant will be valid unless in writing and signed by Landlord."),
        p("All questions concerning the meaning, execution, construction, effect, validity and enforcement of the Lease shall be determined pursuant to the laws of Florida."),
        p("A facsimile copy of the Lease and any signatures hereon shall be considered for all purposes originals."),
        p('As required by law, Landlord makes the following disclosure: "RADON GAS." Radon is a naturally occurring radioactive gas that, when it has accumulated in a building in sufficient quantities, may present health risks to persons who are exposed to it over time. Levels of radon that exceed federal and state guidelines have been found in buildings in Florida. Additional information regarding radon and radon testing may be obtained from your county health department.'),
        p("Tenant has examined the premises, including appliances, fixtures, carpets, drapes and paint, and has found them to be in good, safe and clean condition and repair, except as noted in a Landlord-Tenant Checklist, if applicable."),

        // 30
        clause("30. TENANT'S PERSONAL PROPERTY. ", "TENANT AGREES TO THE FOLLOWING PROVISION. BY SIGNING THIS RENTAL AGREEMENT, THE TENANT AGREES THAT UPON SURRENDER, ABANDONMENT OR RECOVERY OF POSSESSION OF THE DWELLING UNIT DUE TO THE DEATH OF THE LAST REMAINING TENANT, AS PROVIDED BY CHAPTER 83, FLORIDA STATUTES, THE LANDLORD SHALL NOT BE LIABLE OR RESPONSIBLE FOR STORAGE OR DISPOSITION OF THE TENANT'S PERSONAL PROPERTY."),

        p("The Lease has been executed by the parties:", { spacing: { before: 400, after: 300 } }),
        ...signatureBlock("TENANT"),
        p(`LANDLORD: ${LANDLORD_SIGNERS}`, { bold: true, spacing: { before: 200, after: 120 } }),
        p("SIGNATURE: _________________________________", { spacing: { after: 120 } }),
        p("DATE: ____________"),

        p("Copy of Current Version of Florida Residential Landlord and Tenant Act, Part II, Chapter 83, Florida Statutes, to Be Attached.", { spacing: { before: 600, after: 300 }, italics: true }),

        new Paragraph({
          spacing: { before: 400, after: 300 }, alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "EARLY TERMINATION FEE / LIQUIDATED DAMAGES ADDENDUM", bold: true, size: 22 })],
        }),
        p(`[ ] I agree, as provided in the rental agreement, to pay ${usd(earlyTerminationFee)} (an amount that does not exceed 2 months' rent) as liquidated damages or an early termination fee if I elect to terminate the rental agreement, and the landlord waives the right to seek additional rent beyond the month in which the landlord retakes possession.`),
        p("[ ] I do not agree to liquidated damages or an early termination fee, and I acknowledge that the landlord may seek damages as provided by law."),
        ...signatureBlock("TENANT"),
        p(`LANDLORD: ${LANDLORD_SIGNERS}`, { bold: true, spacing: { before: 200, after: 120 } }),
        p("SIGNATURE: _________________________________", { spacing: { after: 120 } }),
        p("DATE: ____________"),
      ],
    }],
  });

  return Packer.toBlob(doc);
}
