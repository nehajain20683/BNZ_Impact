'use client';
import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';

export default function AdminSignOut() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/auth/login' })}
      className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors">
      <LogOut className="w-4 h-4"/> Sign Out
    </button>
  );
}
