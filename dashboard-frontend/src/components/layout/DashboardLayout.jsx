import Sidebar from './Sidebar'
import Header from './Header'

const DashboardLayout = ({ children, title, subtitle, headerAction }) => {
  return (
    <div className="flex min-h-screen bg-neutral-50">
      <Sidebar />
      
      <div className="flex-1 overflow-auto custom-scrollbar">
        <Header title={title} subtitle={subtitle} action={headerAction} />
        
        <div className="max-w-7xl mx-auto px-8 py-8">
          {children}
        </div>
      </div>
    </div>
  )
}

export default DashboardLayout
