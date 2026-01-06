const { docClient, TABLES } = require('../config/dynamodb');
const FeeModel = require('../models/Fee');

/**
 * Calculate pending fees for a student based on fee structures
 * @param {Object} student - The student object with all properties
 * @returns {Object} - Object with totalPending and breakdown array
 */
async function calculatePendingFeesForStudent(student) {
    const studentId = student.studentId;
    console.log('Calculating pending fees for student:', studentId);

    // Get fee structures
    const feeStructuresResult = await docClient.scan({
        TableName: TABLES.FEE_STRUCTURE
    }).promise();
    const feeStructures = feeStructuresResult.Items || [];

    // Get student's fee records
    const studentFees = await FeeModel.getByStudentId(studentId);

    // Parse admission date
    const admissionDateStr = student.admissionDate || student.createdAt || new Date().toISOString();
    let admissionDate;

    if (admissionDateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = admissionDateStr.split('-').map(Number);
        admissionDate = new Date(year, month - 1, day);
    } else {
        admissionDate = new Date(admissionDateStr);
    }

    const today = new Date();
    let totalPending = 0;
    const pendingBreakdown = [];

    for (const structure of feeStructures) {
        if (structure.frequency === 'ONE_TIME') {
            // Check if excludeAdmissionFee flag is set
            if (student.excludeAdmissionFee && structure.feeType === 'ADMISSION_FEE') {
                console.log(`${structure.feeType}: Excluded from pending due to excludeAdmissionFee flag`);
                continue;
            }

            // Check if paid
            const paidFees = studentFees.filter(f =>
                f.feeType === structure.feeType && f.paymentStatus === 'PAID'
            );

            if (paidFees.length > 0) {
                continue;
            }

            // Calculate pending
            const pendingFees = studentFees.filter(f =>
                f.feeType === structure.feeType && f.paymentStatus === 'PENDING'
            );
            const totalPending_recorded = pendingFees.reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);
            const pending = structure.amount - totalPending_recorded;

            if (pending > 0) {
                totalPending += pending;
                pendingBreakdown.push({
                    feeType: structure.feeType,
                    structureAmount: structure.amount,
                    pendingAmount: pending,
                    frequency: 'ONE_TIME'
                });
            }
        } else if (structure.frequency === 'MONTHLY') {
            let startMonth;

            // Debug logging for monthly fees
            console.log(`\nProcessing monthly fee: ${structure.feeType}`);

            // Show all fee records for this fee type
            const allFeesOfType = studentFees.filter(f => f.feeType === structure.feeType);
            if (allFeesOfType.length > 0) {
                console.log(`  Found ${allFeesOfType.length} fee record(s) of type ${structure.feeType}:`);
                allFeesOfType.forEach((fee, idx) => {
                    console.log(`    Record ${idx + 1}: month="${fee.month}", academicYear="${fee.academicYear}", status="${fee.paymentStatus}", amount=${fee.amount}`);
                });
            } else {
                console.log(`  No fee records found for ${structure.feeType}`);
            }

            // Special handling for TRANSPORT_FEE
            if (structure.feeType === 'TRANSPORT_FEE') {
                console.log('  Transport enabled:', student.transportEnabled);
                console.log('  Transport start month:', student.transportStartMonth);

                if (!student.transportEnabled) {
                    console.log('  Skipping - transport not enabled');
                    continue;
                }

                if (student.transportStartMonth) {
                    const [year, month] = student.transportStartMonth.split('-').map(Number);
                    startMonth = new Date(year, month - 1, 1);
                } else {
                    startMonth = new Date(admissionDate.getFullYear(), admissionDate.getMonth(), 1);
                }
            } else {
                startMonth = new Date(admissionDate.getFullYear(), admissionDate.getMonth(), 1);
            }

            const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            let monthPending = 0;
            const months = [];

            console.log(`  Start month: ${startMonth.toLocaleDateString()}`);
            console.log(`  Current month: ${currentMonth.toLocaleDateString()}`);

            // Loop through each month
            for (let d = new Date(startMonth); d <= currentMonth; d.setMonth(d.getMonth() + 1)) {
                const monthName = d.toLocaleString('default', { month: 'long' });
                const year = d.getFullYear();

                const monthPayments = studentFees.filter(f =>
                    f.feeType === structure.feeType &&
                    f.month === monthName &&
                    f.academicYear && f.academicYear.includes(year.toString())
                );

                // Debug logging
                if (structure.feeType === 'TRANSPORT_FEE' && monthPayments.length > 0) {
                    console.log(`Transport Fee - ${monthName} ${year}:`);
                    console.log('  Month payments:', JSON.stringify(monthPayments, null, 2));
                }

                // Check if there's any payment with PAID status for this month
                const hasPaidStatus = monthPayments.some(f => f.paymentStatus === 'PAID');

                // Debug logging
                if (structure.feeType === 'TRANSPORT_FEE' && monthPayments.length > 0) {
                    console.log('  Has PAID status:', hasPaidStatus);
                }

                // If any payment has PAID status, consider this month as fully paid (pending = 0)
                let monthlyPending = 0;
                if (hasPaidStatus) {
                    monthlyPending = 0;
                } else {
                    // No PAID status found, calculate pending
                    const pendingThisMonth = monthPayments
                        .filter(f => f.paymentStatus === 'PENDING')
                        .reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);

                    const amountDue = structure.amount;

                    if (pendingThisMonth >= amountDue) {
                        monthlyPending = 0;
                    } else {
                        monthlyPending = amountDue - pendingThisMonth;
                    }
                }

                // Debug logging
                if (structure.feeType === 'TRANSPORT_FEE' && monthPayments.length > 0) {
                    console.log('  Monthly pending:', monthlyPending);
                }

                if (monthlyPending > 0) {
                    monthPending += monthlyPending;
                    months.push(`${monthName} ${year}: ₹${monthlyPending}`);
                }
            }

            if (monthPending > 0) {
                totalPending += monthPending;
                pendingBreakdown.push({
                    feeType: structure.feeType,
                    structureAmount: structure.amount,
                    pendingAmount: monthPending,
                    frequency: 'MONTHLY',
                    months
                });
            }
        }
    }

    return {
        studentId,
        totalPending,
        breakdown: pendingBreakdown
    };
}

module.exports = {
    calculatePendingFeesForStudent
};
