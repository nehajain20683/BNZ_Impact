// Redirect legacy /superadmin → /sadmin
import { redirect } from 'next/navigation';
export default function LegacySuperAdmin() {
  redirect('/sadmin');
}
