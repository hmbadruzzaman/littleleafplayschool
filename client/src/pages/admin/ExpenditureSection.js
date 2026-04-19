import React from 'react';
import ManageExpendituresModal from '../../components/modals/ManageExpendituresModal';

/* ExpenditureSection delegates entirely to the existing modal rendered inline.
   UI of the modal itself is out of scope for this pass. */
function ExpenditureSection() {
    return <ManageExpendituresModal inline onClose={() => {}} />;
}

export default ExpenditureSection;
