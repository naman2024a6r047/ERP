const { Fee, Student, ClassFeeStructure, Session, User } = require('../models');
const { Op } = require('sequelize');

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

/**
 * Get fee structure for a class.
 * Falls back to a sensible default if no structure configured.
 * (Q2 fix) — logs a warning when fallback defaults are used.
 */
const getFeeStructureForClass = async (className) => {
  const structure = await ClassFeeStructure.findOne({
    where: { class: className, is_active: true }
  });

  if (!structure) {
    console.warn(`[FEE WARNING] No fee structure configured for "${className}". Using hardcoded defaults. Please set up fee structure in admin panel.`);
    return {
      monthly_fee:   2500,
      admission_fee: 5000,
      annual_fee:    1000,
      promotion_fee: 500,
      exam_fee:      300,
      _is_default:   true,
    };
  }

  return structure;
};

/**
 * Generate or get a fee record for a student+month+year+type.
 * If it doesn't exist, create it using the class fee structure.
 * This is the core "upsert" function used everywhere.
 */
const getOrCreateFeeRecord = async (student, month, year, feeType = 'monthly', txn = null) => {
  const options = txn ? { transaction: txn } : {};

  // Check if already exists
  const existing = await Fee.findOne({
    where: {
      student_id: student.id,
      month,
      year,
      fee_type: feeType,
    },
    ...options
  });

  if (existing) return { record: existing, created: false };

  // Get the fee amount from class structure
  const structure = await getFeeStructureForClass(student.class);

  const amountMap = {
    monthly:     parseFloat(structure.monthly_fee   || 0),
    admission:   parseFloat(structure.admission_fee || 0),
    annual:      parseFloat(structure.annual_fee    || 0),
    promotion:   parseFloat(structure.promotion_fee || 0),
    exam:        parseFloat(structure.exam_fee      || 0),
    miscellaneous: 0,
  };

  const totalAmount = amountMap[feeType] || parseFloat(structure.monthly_fee || 2500);

  const record = await Fee.create({
    student_id:    student.id,
    month,
    year:          parseInt(year),
    fee_type:      feeType,
    total_amount:  totalAmount,
    paid_amount:   0,
    status:        'unpaid',
    session_id:    student.session_id,
    fee_breakdown: { [feeType]: totalAmount },
  }, options);

  return { record, created: true };
};

/**
 * Get all active students WITH their fee status for a given month/year.
 * Students without fee records show as "not_generated".
 * This ensures newly created students always appear.
 */
const getStudentsWithFeeStatus = async (month, year, filters = {}) => {
  const studentWhere = { is_active: true, approval_status: 'approved' };
  if (filters.class)   studentWhere.class   = filters.class;
  if (filters.section) studentWhere.section = filters.section;

  const students = await Student.findAll({
    where: studentWhere,
    include: [{ model: Session, as: 'session', attributes: ['id', 'name'] }],
    order: [['class', 'ASC'], ['section', 'ASC'], ['roll_number', 'ASC']],
  });

  if (!students.length) return [];

  // Fetch existing fee records for these students this month and active ClassFeeStructures
  const studentIds = students.map(s => s.id);
  const [feeRecords, feeStructures] = await Promise.all([
    Fee.findAll({
      where: {
        student_id: { [Op.in]: studentIds },
        month,
        year: parseInt(year),
      },
      include: [{
        model: User,
        as: 'collectedByUser',
        attributes: ['id', 'name']
      }]
    }),
    ClassFeeStructure.findAll({ where: { is_active: true } })
  ]);

  const structureMap = {};
  feeStructures.forEach(fs => {
    structureMap[fs.class] = fs;
  });

  // Map fees by student_id + fee_type
  const feeMap = {};
  feeRecords.forEach(f => {
    const key = `${f.student_id}`;
    if (!feeMap[key]) feeMap[key] = [];
    feeMap[key].push(f);
  });

  // Merge students with their fee data
  return students.map(s => {
    const sJson  = s.toJSON();
    const fees   = feeMap[s.id] || [];
    let monthly = fees.find(f => f.fee_type === 'monthly');

    const hasRealMonthly = !!monthly;
    if (!monthly) {
      const clsStructure = structureMap[s.class];
      const monthlyFee = clsStructure ? parseFloat(clsStructure.monthly_fee || 0) : 2500;
      monthly = {
        id: null,
        student_id: s.id,
        month,
        year: parseInt(year),
        fee_type: 'monthly',
        total_amount: monthlyFee,
        paid_amount: 0.00,
        status: 'not_generated',
        fee_breakdown: { monthly: monthlyFee }
      };
    }

    return {
      ...sJson,
      fee_record:     monthly,
      all_fees:       hasRealMonthly ? fees : [monthly, ...fees],
      fee_status:     hasRealMonthly ? monthly.status : 'not_generated',
      total_due:      fees.reduce((a, f) => a + parseFloat(f.total_amount || 0), 0) + (hasRealMonthly ? 0 : monthly.total_amount),
      total_paid:     fees.reduce((a, f) => a + parseFloat(f.paid_amount  || 0), 0),
      has_fee_record: fees.length > 0,
    };
  });
};

/**
 * Generate monthly fee records for all active students.
 * Skips students who already have a record for this month.
 */
const generateMonthlyFees = async (month, year, sessionId = null, userId = null) => {
  const where = { is_active: true, approval_status: 'approved' };
  if (sessionId) where.session_id = sessionId;

  const students = await Student.findAll({ where });
  let created = 0, skipped = 0;

  for (const student of students) {
    const { created: wasCreated } = await getOrCreateFeeRecord(student, month, year, 'monthly');
    if (wasCreated) created++;
    else skipped++;
  }

  return { created, skipped, total: students.length };
};

/**
 * Build a receipt data object for a fee payment.
 * Used by both the API response and PDF generator.
 */
const buildReceiptData = (fee, student, collectedByUser) => {
  const studentName = `${student.first_name} ${student.last_name}`.trim();
  const className = `${student.class} - ${student.section}`;
  const receiptDate = fee.paid_date || new Date().toISOString().split('T')[0];
  const collectedBy = collectedByUser?.name || 'System';

  return {
    student_name:    studentName,
    class:           student.class,
    section:         student.section,
    fee_type:        fee.fee_type,
    total_amount:    parseFloat(fee.total_amount),
    paid_amount:     parseFloat(fee.paid_amount),
    payment_mode:    fee.payment_mode,
    receipt_number:  fee.receipt_number,
    date:            receiptDate,
    collected_by:    collectedBy,
    receipt_date:    receiptDate,
    school: {
      name:    'EduSmart Public School',
      address: '123 Education Lane, Knowledge City',
      phone:   '+91 9999999999',
      email:   'info@edusmartschool.com',
    },
    student: {
      id:          student.student_id,
      name:        studentName,
      class:       className,
      parent_name: student.parent_name,
      phone:       student.parent_phone,
    },
    payment: {
      month:        fee.month,
      year:         fee.year,
      fee_type:     fee.fee_type,
      total_amount: parseFloat(fee.total_amount),
      paid_amount:  parseFloat(fee.paid_amount),
      balance:      parseFloat(fee.total_amount) - parseFloat(fee.paid_amount),
      payment_mode: fee.payment_mode,
      status:       fee.status,
      remarks:      fee.remarks,
    },
    fee_breakdown: fee.fee_breakdown || {},
    collected_by:  collectedBy,
  };
};

/**
 * Create admission fee record for a newly approved student.
 */
const createAdmissionFee = async (student, paidAmountOrTxn = 0, txnObj = null) => {
  let paidAmount = 0;
  let txn = null;
  if (paidAmountOrTxn && typeof paidAmountOrTxn === 'object') {
    txn = paidAmountOrTxn;
  } else {
    paidAmount = parseFloat(paidAmountOrTxn || 0);
    txn = txnObj;
  }

  const options = txn ? { transaction: txn } : {};
  const now     = new Date();
  const month   = MONTHS[now.getMonth()];
  const year    = now.getFullYear();

  const structure = await getFeeStructureForClass(student.class);
  const amount    = parseFloat(structure.admission_fee || 5000);

  if (amount <= 0) return null;

  const status = paidAmount >= amount ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';

  return await Fee.create({
    student_id:    student.id,
    month,
    year,
    fee_type:      'admission',
    total_amount:  amount,
    paid_amount:   paidAmount,
    status:        status,
    session_id:    student.session_id,
    fee_breakdown: { admission: amount },
  }, options);
};

/**
 * Create promotion fee for a student being promoted.
 */
const createPromotionFee = async (student, toClass, sessionId, txn = null) => {
  const options   = txn ? { transaction: txn } : {};
  const structure = await getFeeStructureForClass(toClass);
  const amount    = parseFloat(structure.promotion_fee || 0);

  if (amount <= 0) return null;

  const now   = new Date();
  const month = MONTHS[now.getMonth()];
  const year  = now.getFullYear();

  return await Fee.create({
    student_id:    student.id,
    month,
    year,
    fee_type:      'promotion',
    total_amount:  amount,
    paid_amount:   0,
    status:        'unpaid',
    session_id:    sessionId,
    fee_breakdown: { promotion: amount, to_class: toClass },
  }, options);
};

module.exports = {
  getFeeStructureForClass,
  getOrCreateFeeRecord,
  getStudentsWithFeeStatus,
  generateMonthlyFees,
  buildReceiptData,
  createAdmissionFee,
  createPromotionFee,
  MONTHS,
};
