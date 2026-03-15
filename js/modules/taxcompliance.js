
const TaxCompliance = {
  // SARS Tax Tables 2025 (1 Mar 2024 - 28 Feb 2025)
  taxTables: [
    { limit: 237100, rate: 0.18, deduction: 0 },
    { limit: 370500, rate: 0.26, deduction: 42678 },
    { limit: 512800, rate: 0.31, deduction: 77362 },
    { limit: 673000, rate: 0.36, deduction: 121475 },
    { limit: 857900, rate: 0.39, deduction: 179147 },
    { limit: 1817000, rate: 0.41, deduction: 251258 },
    { limit: Infinity, rate: 0.45, deduction: 644489 }
  ],

  rebates: {
    primary: 17235,
    secondary: 9444, // 65-74
    tertiary: 3145   // 75+
  },

  thresholds: {
    under65: 95750,
    age65to74: 148217,
    age75plus: 165689
  },

  medicalCredits: {
    mainMember: 364,
    firstDependent: 364,
    additionalDependent: 246
  },

  // Statutory Limits
  limits: {
    uifCeiling: 17712, // Max earnings for UIF
    uifMaxDeduction: 177.12, // 1% of ceiling
    retirementFundCapPercent: 27.5,
    retirementFundCapAnnual: 350000
  },

  // Helper to calculate age from ID or DOB
  calculateAge: function (dobString) {
    if (!dobString) return 30; // Default if missing
    const dob = new Date(dobString);
    const ageDifMs = Date.now() - dob.getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  },

  render: function (container) {
    const html = `
          <div class="page-title-box">
            <h2>Tax & Compliance</h2>
            <div style="color: var(--gray-500);">South African Legislative Parameters (2024/2025)</div>
          </div>
          <div class="card"><div class="card-body"><h3>SARS Compliance Module Loaded</h3><p>Production-grade tax tables active.</p></div></div>
        `;
    container.innerHTML = html;
  },

  /**
   * Calculates PAYE based on Monthly Remuneration using Annual Equivalent method
   * @param {number} monthlyRemuneration - Taxable income for the month
   * @param {number} age - Employee age
   * @param {number} medicalMembers - Number of medical aid members
   * @returns {number} Monthly PAYE amount
   */
  calculatePAYE: function (monthlyRemuneration, age = 35, medicalMembers = 0) {
    if (!monthlyRemuneration || monthlyRemuneration <= 0) return 0;

    // 1. Annualize
    const annualEquivalent = monthlyRemuneration * 12;

    // 2. Determine Gross Tax on Annual Equivalent
    let grossTax = 0;
    for (let i = 0; i < this.taxTables.length; i++) {
      const bracket = this.taxTables[i];
      const prevLimit = i === 0 ? 0 : this.taxTables[i - 1].limit;

      if (annualEquivalent <= bracket.limit) {
        grossTax = bracket.deduction + ((annualEquivalent - prevLimit) * bracket.rate);
        break;
      } else if (i === this.taxTables.length - 1) {
        grossTax = bracket.deduction + ((annualEquivalent - prevLimit) * bracket.rate);
      }
    }

    // 3. Deduct Rebates
    let rebate = this.rebates.primary;
    if (age >= 65) rebate += this.rebates.secondary;
    if (age >= 75) rebate += this.rebates.tertiary;

    let netTax = Math.max(0, grossTax - rebate);

    // 4. Deduct Medical Tax Credits (Annualized)
    // Note: MTC is a tax rebate, not a deduction from income
    let monthlyMTC = 0;
    if (medicalMembers >= 1) {
      monthlyMTC += this.medicalCredits.mainMember;
      if (medicalMembers > 1) monthlyMTC += this.medicalCredits.firstDependent;
      if (medicalMembers > 2) monthlyMTC += (medicalMembers - 2) * this.medicalCredits.additionalDependent;
    }
    const annualMTC = monthlyMTC * 12;
    netTax = Math.max(0, netTax - annualMTC);

    // 5. De-annualize for Monthly PAYE
    return netTax / 12;
  },

  calculateUIF: function (grossRemuneration) {
    // UIF is 1% of Gross, capped at 1% of ceiling
    const uifableAmount = Math.min(grossRemuneration, this.limits.uifCeiling);
    return uifableAmount * 0.01;
  },

  calculateSDL: function (sdlRemuneration) {
    // SDL is 1% of SDL-able amount (usually Gross - some exclusions, keeping simple for now)
    // Assuming all gross is SDL-able
    return sdlRemuneration * 0.01;
  },

  /**
   * Correctly caps retirement deductions for TAX purposes vs PAYROLL purposes.
   * Payroll deduction is what you pay. Tax deduction is what SARS allows.
   * @param {number} rfi - Retirement Funding Income
   * @param {number} actualContribution - The actual R/value contributed
   * @returns {number} The allowable tax deduction
   */
  calculateRetirementTaxDeduction: function (rfi, actualContribution) {
    // Cap 1: 27.5% of RFI (or Taxable Income, usually higher of two, using RFI for monthly payroll simplicity)
    const capPercentage = rfi * (this.limits.retirementFundCapPercent / 100);

    // Cap 2: R350k per annum -> R29,166 per month
    const capAnnual = this.limits.retirementFundCapAnnual / 12;

    // Allowable is lowest of: Actual, 27.5% Cap, Annual Cap
    return Math.min(actualContribution, capPercentage, capAnnual);
  }
};

window.renderTaxCompliance = function (container) {
  TaxCompliance.render(container);
};

window.TaxCalc = TaxCompliance;
