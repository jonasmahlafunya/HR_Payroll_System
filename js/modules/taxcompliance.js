const TaxCompliance = {
  // SA Tax Tables 2024/2025
  taxTables: [
    { limit: 237100, rate: 0.18, deduction: 0 },
    { limit: 370500, rate: 0.26, deduction: 42678 },
    { limit: 512800, rate: 0.31, deduction: 77362 },
    { limit: 673000, rate: 0.36, deduction: 121475 },
    { limit: 857900, rate: 0.39, deduction: 179147 },
    { limit: 1817000, rate: 0.41, deduction: 251258 },
    { limit: Infinity, rate: 0.45, deduction: 644489 }
  ],

  // Rebates 2024/2025
  rebates: {
    primary: 17235,
    secondary: 9444, // 65-74
    tertiary: 3145   // 75+
  },

  // Tax Thresholds 2024/2025
  thresholds: {
    under65: 95750,
    age65to74: 148217,
    age75plus: 165689
  },

  // Medical Tax Credits 2024/2025 (Monthly)
  medicalCredits: {
    mainMember: 364,
    firstDependent: 364,
    additionalDependent: 246
  },

  render: function (container) {
    const html = `
      <div class="page-title-box">
        <h2>Tax & Compliance</h2>
        <div style="color: var(--gray-500);">South African Legislative Parameters (2024/2025)</div>
      </div>

      <div class="grid-3" style="margin-bottom: 24px;">
        <div class="card">
           <div class="card-body">
             <h4 class="card-title">Tax Year</h4>
             <div style="font-size: 2rem; font-weight: 700; color: var(--primary);">2025</div>
             <div style="color: var(--success);">1 Mar 2024 - 28 Feb 2025</div>
           </div>
        </div>
        <div class="card">
           <div class="card-body">
             <h4 class="card-title">UIF Ceiling</h4>
             <div style="font-size: 2rem; font-weight: 700; color: var(--gray-800);">R 17,712</div>
             <div style="color: var(--gray-500);">Max deduction: R 177.12</div>
           </div>
        </div>
        <div class="card">
           <div class="card-body">
             <h4 class="card-title">SDL Rate</h4>
             <div style="font-size: 2rem; font-weight: 700; color: var(--gray-800);">1%</div>
             <div style="color: var(--gray-500);">Of SDL-able earnings</div>
           </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h4 class="card-title">PAYE Tax Tables (2024/2025)</h4></div>
        <div class="table-responsive">
          <table>
             <thead>
               <tr>
                 <th>Taxable Income (R)</th>
                 <th>Base Tax (R)</th>
                 <th>Rate</th>
                 <th>Amount Above (R)</th>
               </tr>
             </thead>
             <tbody>
               <tr><td>1 - 237 100</td><td>0</td><td>18%</td><td>0</td></tr>
               <tr><td>237 101 - 370 500</td><td>42 678</td><td>26%</td><td>237 100</td></tr>
               <tr><td>370 501 - 512 800</td><td>77 362</td><td>31%</td><td>370 500</td></tr>
               <tr><td>512 801 - 673 000</td><td>121 475</td><td>36%</td><td>512 800</td></tr>
               <tr><td>673 001 - 857 900</td><td>179 147</td><td>39%</td><td>673 000</td></tr>
               <tr><td>857 901 - 1 817 000</td><td>251 258</td><td>41%</td><td>857 900</td></tr>
               <tr><td>1 817 001+</td><td>644 489</td><td>45%</td><td>1 817 000</td></tr>
             </tbody>
          </table>
        </div>
      </div>

      <div class="card">
         <div class="card-header"><h4 class="card-title">Rebates & Thresholds</h4></div>
         <div class="card-body grid-2">
            <div>
              <h5 style="margin-bottom: 12px;">Tax Thresholds</h5>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--gray-200); padding: 8px 0;"><span>Under 65</span><strong>R 95 750</strong></div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--gray-200); padding: 8px 0;"><span>65 - 74</span><strong>R 148 217</strong></div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0;"><span>75 and older</span><strong>R 165 689</strong></div>
            </div>
            <div>
              <h5 style="margin-bottom: 12px;">Tax Rebates</h5>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--gray-200); padding: 8px 0;"><span>Primary</span><strong>R 17 235</strong></div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--gray-200); padding: 8px 0;"><span>Secondary (65+)</span><strong>R 9 444</strong></div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0;"><span>Tertiary (75+)</span><strong>R 3 145</strong></div>
            </div>
         </div>
      </div>
    `;
    container.innerHTML = html;
  },

  // Calculation Logic exposed for Payroll Module
  calculatePAYE: function (annualSalary, age = 35) {
    if (!annualSalary) return 0;

    // 1. Determine Tax Bracket
    let tax = 0;
    for (let i = 0; i < this.taxTables.length; i++) {
      // Optimized calc logic: check if salary is within this bracket or above
      const bracket = this.taxTables[i];
      const prevLimit = i === 0 ? 0 : this.taxTables[i - 1].limit;

      if (annualSalary <= bracket.limit) {
        tax = bracket.deduction + ((annualSalary - prevLimit) * bracket.rate);
        break;
      } else if (i === this.taxTables.length - 1) {
        // Top bracket
        tax = bracket.deduction + ((annualSalary - prevLimit) * bracket.rate);
      }
    }

    // 2. Apply Rebates
    let rebate = this.rebates.primary;
    if (age >= 65) rebate += this.rebates.secondary;
    if (age >= 75) rebate += this.rebates.tertiary;

    tax = Math.max(0, tax - rebate);

    return tax;
  },

  calculateUIF: function (monthlyGross) {
    const limit = 17712;
    const calcAmount = Math.min(monthlyGross, limit);
    return calcAmount * 0.01;
  },

  calculateSDL: function (monthlyGross) {
    return monthlyGross * 0.01;
  },

  calculateMedicalCredits: function (members) {
    if (members < 1) return 0;
    let credits = this.medicalCredits.mainMember;
    if (members > 1) credits += this.medicalCredits.firstDependent;
    if (members > 2) credits += (members - 2) * this.medicalCredits.additionalDependent;
    return credits;
  }
};

window.renderTaxCompliance = function (container) {
  TaxCompliance.render(container);
};

// Export logic globally for other modules
window.TaxCalc = TaxCompliance;
