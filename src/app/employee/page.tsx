import type { Metadata } from 'next'
import EmployeeDashboard from '@/components/employees/EmployeeDashboard'
export const metadata: Metadata = { title: 'دعيدر | تطبيق الموظفين', applicationName: 'دعيدر موظفين', manifest: '/employee.webmanifest', robots: { index: false, follow: false } }
export default function EmployeePage() { return <EmployeeDashboard /> }
