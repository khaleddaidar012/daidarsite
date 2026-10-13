import type { Metadata } from 'next'
import EmployeeDashboard from '@/components/employees/EmployeeDashboard'
export const metadata: Metadata = { title: 'حضور الموظفين', robots: { index: false, follow: false } }
export default function EmployeePage() { return <EmployeeDashboard /> }
