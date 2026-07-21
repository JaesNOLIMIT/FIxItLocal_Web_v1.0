import ManageReportsPage from '../shared/ManageReportsPage';

function AdminManageReportsPage() {
  return (
    <ManageReportsPage
      title="Manage Reports"
      description="View reports, assigned teams, and reassign to the correct team or department."
      mode="reassign"
    />
  );
}

export default AdminManageReportsPage;
