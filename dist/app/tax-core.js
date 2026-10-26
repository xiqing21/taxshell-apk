/**
 * tax-core.js — 个税本地引擎 v1.0
 * 全本地数据 + 累计预扣法计税，无任何服务器依赖
 */
(function (global) {
  'use strict';

  var LS = {
    get: function (k, def) {
      try {
        var v = localStorage.getItem(k);
        return v == null ? def : JSON.parse(v);
      } catch (e) { return def; }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
    },
    del: function (k) {
      try { localStorage.removeItem(k); } catch (e) {}
    }
  };

  /* ============ 存储键 ============ */
  var K_PROFILE = 'tax_profile';        // 纳税人信息
  var K_CONFIG  = 'tax_config';         // 扣除配置
  var K_DATA    = 'tax_data';           // { year: { months: [...] } }
  var K_ISSUES  = 'tax_issues';         // 纳税记录开具申请
  var K_ALBUM   = 'tax_album';          // 已保存记录图

  /* ============ 默认值 ============ */
  var DEFAULT_PROFILE = {
    name: '张三',
    idType: '居民身份证',
    idNumber: '110101199001011234',
    phone: '13800138000'
  };

  var DEFAULT_CONFIG = {
    // 五险一金个人部分（占社保基数的比例 %）
    pensionRate: 8,        // 养老
    medicalRate: 2,        // 医疗
    unemploymentRate: 0.5, // 失业
    housingFundRate: 12,   // 公积金
    socialBase: 0,         // 社保基数，0=按实际工资
    // 专项附加扣除（元/月）
    childrenEdu: 0,        // 子女教育
    housingLoan: 0,        // 住房贷款利息
    housingRent: 0,        // 住房租金
    elderly: 0,            // 赡养老人
    continuingEdu: 0,      // 继续教育
    babyCare: 0,           // 3岁以下婴幼儿照护
    majorMedical: 0        // 大病医疗（年度）
  };

  /* 累计预扣率表（年度） */
  var BRACKETS = [
    { limit: 36000,     rate: 0.03, quick: 0 },
    { limit: 144000,    rate: 0.10, quick: 2520 },
    { limit: 300000,    rate: 0.20, quick: 16920 },
    { limit: 420000,    rate: 0.25, quick: 31920 },
    { limit: 660000,    rate: 0.30, quick: 52920 },
    { limit: 960000,    rate: 0.35, quick: 85920 },
    { limit: Infinity,  rate: 0.45, quick: 181920 }
  ];

  function round2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }
  function fmt2(n) {
    n = Number(n) || 0;
    var s = n.toFixed(2);
    return s;
  }
  function bracketFor(taxable) {
    for (var i = 0; i < BRACKETS.length; i++) {
      if (taxable <= BRACKETS[i].limit) return BRACKETS[i];
    }
    return BRACKETS[BRACKETS.length - 1];
  }

  /* ============ Profile ============ */
  function getProfile() {
    return Object.assign({}, DEFAULT_PROFILE, LS.get(K_PROFILE, {}));
  }
  function setProfile(p) {
    LS.set(K_PROFILE, Object.assign(getProfile(), p));
  }

  /* ============ Config ============ */
  function getConfig() {
    return Object.assign({}, DEFAULT_CONFIG, LS.get(K_CONFIG, {}));
  }
  function setConfig(c) {
    LS.set(K_CONFIG, Object.assign(getConfig(), c));
  }

  /* ============ 月度明细 ============ */
  /**
   * month record 结构（与原版 api/tax?action=records 对齐）:
   * { month, income, income_type, income_subtype, company_name,
   *   tax_reported, tax_free_income, deduction_fee, special_deduction,
   *   pension_insurance, medical_insurance, unemployment_insurance,
   *   housing_fund, other_deduction, donation_deduction,
   *   company_tax_id, report_channel, report_date, tax_period }
   */

  function insuranceOf(gross, cfg) {
    var base = Number(cfg.socialBase) > 0 ? Number(cfg.socialBase) : gross;
    return {
      pension: round2(base * cfg.pensionRate / 100),
      medical: round2(base * cfg.medicalRate / 100),
      unemployment: round2(base * cfg.unemploymentRate / 100),
      housingFund: round2(base * cfg.housingFundRate / 100)
    };
  }

  function specialTotal(cfg) {
    return round2(
      Number(cfg.childrenEdu) + Number(cfg.housingLoan) + Number(cfg.housingRent) +
      Number(cfg.elderly) + Number(cfg.continuingEdu) + Number(cfg.babyCare)
    );
  }

  /**
   * 生成整年数据（工资薪金，累计预扣法）
   * monthlyIncome: 每月税前工资
   * months: 生成的月份数（默认到当前月或 12）
   */
  function generateYear(year, monthlyIncome, monthCount, companyName) {
    var cfg = getConfig();
    var prof = getProfile();
    monthCount = monthCount || 12;
    var months = [];
    var cumIncome = 0, cumIns = 0, cumSpecial = 0, cumTax = 0;
    var now = new Date();
    var reportDate = function (m) {
      return year + '-' + (m < 10 ? '0' + m : m) + '-15';
    };

    for (var m = 1; m <= monthCount; m++) {
      var gross = round2(monthlyIncome);
      var ins = insuranceOf(gross, cfg);
      var insTotal = round2(ins.pension + ins.medical + ins.unemployment + ins.housingFund);
      var special = specialTotal(cfg);

      cumIncome = round2(cumIncome + gross);
      cumIns = round2(cumIns + insTotal);
      cumSpecial = round2(cumSpecial + special);

      // 累计应纳税所得额 = 累计收入 - 5000*月数 - 累计五险一金 - 累计专项附加
      var cumTaxable = round2(cumIncome - 5000 * m - cumIns - cumSpecial);
      if (cumTaxable < 0) cumTaxable = 0;
      var b = bracketFor(cumTaxable);
      var cumTaxPayable = round2(cumTaxable * b.rate - b.quick);
      var monthTax = round2(cumTaxPayable - cumTax);
      if (monthTax < 0) monthTax = 0;
      cumTax = round2(cumTax + monthTax);

      months.push({
        month: m,
        income: fmt2(gross),
        income_type: '工资薪金',
        income_subtype: '正常工资薪金',
        company_name: companyName || prof.name + '任职单位',
        company_tax_id: '91110000MA0' + (100000 + (year % 100) * 137 + m * 31) + 'X',
        income_this_period: fmt2(gross),
        tax_free_income: '0.00',
        deduction_fee: fmt2(5000),
        special_deduction: fmt2(special),
        pension_insurance: fmt2(ins.pension),
        medical_insurance: fmt2(ins.medical),
        unemployment_insurance: fmt2(ins.unemployment),
        housing_fund: fmt2(ins.housingFund),
        other_deduction: '0.00',
        donation_deduction: '0.00',
        enterprise_annuity: '0.00',
        commercial_health: '0.00',
        tax_deferred_pension: '0.00',
        other_deduction_other: '0.00',
        tax_reported: fmt2(monthTax),
        tax_authority: '国家税务总局北京市税务局',
        report_channel: '扣缴义务人代扣代缴',
        report_date: reportDate(m),
        tax_period: year + '-' + (m < 10 ? '0' + m : m) + '-01~' + year + '-' + (m < 10 ? '0' + m : m) + '-' + new Date(year, m, 0).getDate()
      });
    }
    return { year: year, months: months };
  }

  /* ============ 数据存取 ============ */
  function getAllData() {
    return LS.get(K_DATA, {});
  }
  function getYear(year) {
    var d = getAllData();
    return d[year] || null;
  }
  function setYear(year, data) {
    var d = getAllData();
    d[year] = data;
    LS.set(K_DATA, d);
  }
  function removeYear(year) {
    var d = getAllData();
    delete d[year];
    LS.set(K_DATA, d);
  }
  function listYears() {
    var d = getAllData();
    return Object.keys(d).map(Number).sort(function (a, b) { return b - a; });
  }

  /** 记录列表（对齐原版 records 响应） */
  function getRecords(year, typeFilter) {
    var y = getYear(year);
    if (!y) return { records: [], income_total: '0.00', tax_total: '0.00' };
    var recs = [];
    var incomeTotal = 0, taxTotal = 0;
    (y.months || []).forEach(function (m) {
      if (typeFilter && typeFilter.length && typeFilter.indexOf(m.income_type) < 0) return;
      recs.push(m);
      incomeTotal += Number(m.income) || 0;
      taxTotal += Number(m.tax_reported) || 0;
    });
    return {
      records: recs,
      income_total: fmt2(incomeTotal),
      tax_total: fmt2(taxTotal)
    };
  }

  function getDetail(year, month) {
    var y = getYear(year);
    if (!y) return null;
    var list = (y.months || []).filter(function (m) { return Number(m.month) === Number(month); });
    return list[0] || null;
  }

  /** 更新某月数据（编辑器用） */
  function updateMonth(year, month, patch) {
    var y = getYear(year);
    if (!y) return false;
    for (var i = 0; i < y.months.length; i++) {
      if (Number(y.months[i].month) === Number(month)) {
        Object.assign(y.months[i], patch);
        // 若改了收入则重算税
        if (patch.income != null) {
          recomputeYear(year);
        }
        setYear(year, y);
        return true;
      }
    }
    return false;
  }

  /** 整年重算（累计预扣） */
  function recomputeYear(year) {
    var y = getYear(year);
    if (!y) return;
    var cfg = getConfig();
    var cumIncome = 0, cumIns = 0, cumSpecial = 0, cumTax = 0;
    var months = (y.months || []).slice().sort(function (a, b) { return a.month - b.month; });
    months.forEach(function (m, idx) {
      var n = idx + 1;
      var gross = Number(m.income) || 0;
      var ins = insuranceOf(gross, cfg);
      var insTotal = round2(ins.pension + ins.medical + ins.unemployment + ins.housingFund);
      var special = specialTotal(cfg);
      cumIncome = round2(cumIncome + gross);
      cumIns = round2(cumIns + insTotal);
      cumSpecial = round2(cumSpecial + special);
      var cumTaxable = round2(cumIncome - 5000 * n - cumIns - cumSpecial);
      if (cumTaxable < 0) cumTaxable = 0;
      var b = bracketFor(cumTaxable);
      var cumTaxPayable = round2(cumTaxable * b.rate - b.quick);
      var monthTax = round2(cumTaxPayable - cumTax);
      if (monthTax < 0) monthTax = 0;
      cumTax = round2(cumTax + monthTax);
      m.tax_reported = fmt2(monthTax);
      m.pension_insurance = fmt2(ins.pension);
      m.medical_insurance = fmt2(ins.medical);
      m.unemployment_insurance = fmt2(ins.unemployment);
      m.housing_fund = fmt2(ins.housingFund);
      m.deduction_fee = fmt2(5000);
      m.special_deduction = fmt2(special);
    });
    setYear(year, { year: year, months: months });
  }

  /* ============ 纳税记录开具 ============ */
  function genVcode() {
    // 16 位，X 开头（与官方新规一致）
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var s = 'X';
    for (var i = 0; i < 15; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  function listIssues() {
    return LS.get(K_ISSUES, []);
  }

  function createIssue(year, startMonth, endMonth) {
    var prof = getProfile();
    var issue = {
      id: 'ISS' + Date.now(),
      apply_time: formatDateTime(new Date()),
      period_start: year + '-' + pad2(startMonth),
      period_end: year + '-' + pad2(endMonth),
      year: year,
      record_no: genVcode(),
      scope: '全国',
      status: '制作成功',
      name: prof.name,
      id_number: maskId(prof.idNumber),
      created_at: Date.now()
    };
    var list = listIssues();
    list.unshift(issue);
    LS.set(K_ISSUES, list);
    return issue;
  }

  function getIssue(id) {
    var list = listIssues();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function removeIssue(id) {
    var list = listIssues().filter(function (x) { return x.id !== id; });
    LS.set(K_ISSUES, list);
  }

  /* ============ 相册（已保存的记录图） ============ */
  function listAlbum() { return LS.get(K_ALBUM, []); }
  function addToAlbum(item) {
    var a = listAlbum();
    a.unshift(item);
    LS.set(K_ALBUM, a.slice(0, 50));
  }

  /* ============ 工具 ============ */
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function formatDateTime(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
      ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
  }
  function maskId(id) {
    id = String(id || '');
    if (id.length < 8) return id;
    return id.substring(0, 1) + '*'.repeat(id.length - 2) + id.substring(id.length - 1);
  }
  function fmtMoney(n) {
    return fmt2(n);
  }

  /* ============ 导出 ============ */
  global.TaxCore = {
    // profile
    getProfile: getProfile, setProfile: setProfile,
    // config
    getConfig: getConfig, setConfig: setConfig,
    // data
    generateYear: generateYear, recomputeYear: recomputeYear,
    getYear: getYear, setYear: setYear, removeYear: removeYear, listYears: listYears,
    getRecords: getRecords, getDetail: getDetail, updateMonth: updateMonth,
    // issues
    listIssues: listIssues, createIssue: createIssue, getIssue: getIssue, removeIssue: removeIssue,
    // album
    listAlbum: listAlbum, addToAlbum: addToAlbum,
    // utils
    fmt2: fmt2, fmtMoney: fmtMoney, genVcode: genVcode, pad2: pad2,
    BRACKETS: BRACKETS
  };
})(window);
