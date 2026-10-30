export function toNum(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && 'toNumber' in val) return val.toNumber();
  const n = parseFloat(val.toString());
  return isNaN(n) ? 0 : n;
}

export function mapParticular(p: any) {
  return {
    id: p.id,
    particular: p.particular,
    defaultUnit: p.defaultUnit || 'mtr',
    defaultRate: toNum(p.defaultRate),
    usageCount: p.usageCount || 1,
    lastUsedAt: p.lastUsedAt ? p.lastUsedAt.toISOString() : new Date().toISOString(),
  };
}

export function mapQuotationItem(i: any) {
  return {
    id: i.id,
    quotationId: i.quotationId,
    srNo: i.srNo,
    particular: i.particular,
    description: i.description || null,
    quantity: toNum(i.quantity),
    unit: i.unit || 'mtr',
    rate: toNum(i.rate),
    total: toNum(i.total),
  };
}

export function mapQuotationWindow(w: any) {
  return {
    id: w.id,
    quotationId: w.quotationId,
    location: w.location,
    windowName: w.windowName || '',
    treatmentType: w.treatmentType || 'Curtain',
    width: toNum(w.width),
    height: toNum(w.height),
    panels: w.panels,
    isDoubleCurtain: !!w.isDoubleCurtain,
    curtainType: w.curtainType || 'Main',
    sheerWidth: w.sheerWidth != null ? toNum(w.sheerWidth) : null,
    sheerHeight: w.sheerHeight != null ? toNum(w.sheerHeight) : null,
    sheerPanels: w.sheerPanels,
    requirement: toNum(w.requirement),
    unit: w.unit || 'm',
    remarks: w.remarks || '',
  };
}

export function mapWorkStage(s: any) {
  return {
    id: s.id,
    productId: s.productId,
    stageOrder: s.stageOrder,
    stageName: s.stageName,
    isCompleted: !!s.isCompleted,
    dateCompleted: s.dateCompleted ? s.dateCompleted.toISOString() : null,
    remarks: s.remarks || '',
  };
}

export function mapProduct(p: any) {
  const stages = (p.workStages || []).map(mapWorkStage);
  stages.sort((a: any, b: any) => a.stageOrder - b.stageOrder);
  const completedStages = stages.filter((s: any) => s.isCompleted).length;

  const quotationAmount = toNum(p.quotationAmount);
  const discountAmount = toNum(p.discountAmount);
  const finalAmount = quotationAmount - discountAmount;
  const advancePayment = toNum(p.advancePayment);
  const paymentStatus = p.paymentStatus || 'Pending';
  const balanceAmount = paymentStatus === 'Full payment cleared' ? 0 : finalAmount - advancePayment;

  return {
    id: p.id,
    customerId: p.customerId,
    quotationId: p.quotationId,
    customerName: p.customer?.name || '',
    productName: p.productName,
    serialNumber: p.serialNumber || '',
    company: p.company || '',
    productType: p.productType,
    quantity: p.quantity || 1,
    colour: p.colour || '',
    measurement: p.measurement || '',
    dateOrdered: p.dateOrdered ? (typeof p.dateOrdered === 'string' ? p.dateOrdered : p.dateOrdered.toISOString()) : null,
    expectedDeliveryDate: p.expectedDeliveryDate ? (typeof p.expectedDeliveryDate === 'string' ? p.expectedDeliveryDate : p.expectedDeliveryDate.toISOString()) : null,
    internalRemarks: p.internalRemarks || '',
    quotationAmount,
    discountAmount,
    finalAmount,
    quotationStatus: p.quotationStatus || 'Pending',
    advancePayment,
    balanceAmount,
    paymentStatus,
    paymentDate: p.paymentDate ? (typeof p.paymentDate === 'string' ? p.paymentDate : p.paymentDate.toISOString()) : null,
    paymentRemarks: p.paymentRemarks || '',
    workStages: stages,
    completedStages,
    totalStages: stages.length,
  };
}

export function mapQuotation(q: any) {
  const items = (q.items || []).map(mapQuotationItem).sort((a: any, b: any) => a.srNo - b.srNo);
  const products = (q.products || []).map(mapProduct);
  const windows = (q.windows || []).map(mapQuotationWindow);

  const finalAmount = toNum(q.finalAmount);
  const advancePayment = toNum(q.advancePayment);

  const totalFinalAmount =
    items.length > 0
      ? finalAmount
      : products.reduce((acc: number, p: any) => acc + toNum(p.finalAmount), 0);

  const totalProductAdvance = products.reduce((acc: number, p: any) => acc + toNum(p.advancePayment), 0);
  const totalAdvance = advancePayment + totalProductAdvance;

  const totalBalance =
    items.length > 0
      ? finalAmount - advancePayment
      : products.reduce((acc: number, p: any) => acc + (p.paymentStatus === 'Full payment cleared' ? 0 : toNum(p.balanceAmount)), 0);

  let quotationStatus = 'Pending';
  if (items.length > 0) {
    quotationStatus = 'Approved';
  } else if (products.length > 0) {
    if (products.every((p: any) => p.quotationStatus === 'Approved')) {
      quotationStatus = 'Approved';
    } else if (products.every((p: any) => p.quotationStatus === 'Rejected')) {
      quotationStatus = 'Rejected';
    } else {
      quotationStatus = 'Pending';
    }
  }

  let paymentStatus = 'Pending';
  if (items.length > 0) {
    paymentStatus =
      finalAmount > 0 && advancePayment >= finalAmount
        ? 'Full payment cleared'
        : advancePayment > 0
        ? 'Partially Paid'
        : 'Pending';
  } else if (products.length > 0) {
    if (products.every((p: any) => p.paymentStatus === 'Full payment cleared')) {
      paymentStatus = 'Full payment cleared';
    } else {
      paymentStatus = 'Pending';
    }
  }

  return {
    id: q.id,
    customerId: q.customerId,
    customerName: q.customer?.name || '',
    customerContactNumber: q.customer?.contactNumber || '',
    customerAddress: q.customer?.address || '',
    quotationNumber: q.quotationNumber || '',
    title: q.title || '',
    createdAt: q.createdAt ? (typeof q.createdAt === 'string' ? q.createdAt : q.createdAt.toISOString()) : new Date().toISOString(),
    remarks: q.remarks || '',
    advancePayment,
    advancePaymentDate: q.advancePaymentDate ? (typeof q.advancePaymentDate === 'string' ? q.advancePaymentDate : q.advancePaymentDate.toISOString()) : null,
    discountType: q.discountType || 'percent',
    discountValue: toNum(q.discountValue),
    discountAmount: toNum(q.discountAmount),
    subTotal: toNum(q.subTotal),
    finalAmount,
    items,
    products,
    windows,
    totalFinalAmount,
    totalProductAdvance: items.length > 0 ? advancePayment : totalProductAdvance,
    totalAdvance,
    totalBalance,
    quotationStatus,
    paymentStatus,
  };
}

export function mapCustomer(c: any) {
  const quoteProducts = (c.quotations || []).reduce((acc: number, q: any) => acc + (q.products ? q.products.length : 0), 0);
  const directProducts = c.products ? c.products.filter((p: any) => !p.quotationId).length : 0;

  return {
    id: c.id,
    name: c.name,
    contactNumber: c.contactNumber || '',
    alternateContactNumber: c.alternateContactNumber || '',
    address: c.address || '',
    notes: c.notes || '',
    createdAt: c.createdAt ? c.createdAt.toISOString() : new Date().toISOString(),
    productCount: quoteProducts + directProducts,
  };
}
