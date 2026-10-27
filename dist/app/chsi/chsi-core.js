// chsi-core.js — 学信网模拟器数据层 + 本地引擎（完全本地，无服务器）
const CHSI = {
  storage: {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } },
    set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
    remove(k) { localStorage.removeItem(k); }
  },

  // 默认示例数据（可编辑器修改）
  defaultProfile: {
    name: '张三',
    gender: '男',
    idcard: '110101199001011234',
    birth: '1990-01-01',
    avatar: 'https://via.placeholder.com/120'
  },

  defaultEducations: [
    {
      id: 1,
      type: '学籍',
      school: '北京大学',
      department: '信息科学技术学院',
      major: '计算机科学与技术',
      level: '本科',
      duration: '4年',
      start: '2018-09-01',
      end: '2022-07-01',
      status: '在读',
      certNo: '',
      vcode: 'A1B2C3D4E5F6G7H8',
      validUntil: '2026-12-31'
    },
    {
      id: 2,
      type: '学历',
      school: '北京大学',
      department: '信息科学技术学院',
      major: '计算机科学与技术',
      level: '本科',
      duration: '4年',
      start: '2018-09-01',
      end: '2022-07-01',
      status: '已毕业',
      certNo: '1101012018070001',
      vcode: 'A9K8J7H6G5F4E3D2C1',
      validUntil: '2027-12-31'
    }
  ],

  init() {
    if (!this.storage.get('chsi_profile')) {
      this.storage.set('chsi_profile', this.defaultProfile);
    }
    if (!this.storage.get('chsi_educations')) {
      this.storage.set('chsi_educations', this.defaultEducations);
    }
  },

  getProfile() { return this.storage.get('chsi_profile'); },
  setProfile(p) { this.storage.set('chsi_profile', p); },

  getEducations() { return this.storage.get('chsi_educations') || []; },
  setEducations(list) { this.storage.set('chsi_educations', list); },

  addEducation(item) {
    const list = this.getEducations();
    item.id = Date.now();
    if (!item.vcode) item.vcode = this.generateVCode();
    list.push(item);
    this.setEducations(list);
    return item;
  },

  updateEducation(id, patch) {
    const list = this.getEducations();
    const idx = list.findIndex(e => e.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...patch };
      this.setEducations(list);
    }
  },

  deleteEducation(id) {
    const list = this.getEducations().filter(e => e.id !== id);
    this.setEducations(list);
  },

  generateVCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let v = 'A';
    for (let i = 0; i < 15; i++) v += chars[Math.floor(Math.random() * chars.length)];
    return v;
  },

  findByVCode(vcode) {
    return this.getEducations().find(e => e.vcode === vcode.toUpperCase());
  },

  resetDemo() {
    this.storage.remove('chsi_profile');
    this.storage.remove('chsi_educations');
    this.init();
  }
};

CHSI.init();
window.CHSI = CHSI; // 全局可用