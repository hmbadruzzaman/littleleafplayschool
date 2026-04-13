import React, { useState } from 'react';
import RecordFeePaymentForm from '../../components/forms/RecordFeePaymentForm';
import ManageFeeStructureModal from '../../components/modals/ManageFeeStructureModal';

function FeesSection() {
    const [showRecord, setShowRecord] = useState(false);
    const [showStructure, setShowStructure] = useState(false);

    return (
        <div className="card">
            <div className="card-header">
                <h2>Fee Management</h2>
            </div>
            <div className="actions-grid" style={{ marginTop: '16px' }}>
                <button className="action-btn" onClick={() => setShowRecord(true)}>
                    💰 Record Fee Payment
                </button>
                <button className="action-btn" onClick={() => setShowStructure(true)}>
                    📋 Manage Fee Structure
                </button>
            </div>

            {showRecord && (
                <RecordFeePaymentForm
                    onClose={() => setShowRecord(false)}
                    onSuccess={() => setShowRecord(false)}
                />
            )}
            {showStructure && (
                <ManageFeeStructureModal onClose={() => setShowStructure(false)} />
            )}
        </div>
    );
}

export default FeesSection;
