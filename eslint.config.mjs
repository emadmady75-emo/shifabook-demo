import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

const legacyAnyFiles = [
  'src/app/api/admin/finance/route.ts',
  'src/app/api/admin/users/route.ts',
  'src/app/api/public/availability/route.ts',
  'src/app/api/public/otp/request/route.ts',
  'src/app/api/public/otp/verify/route.ts',
  'src/app/api/public/whatsapp/route.ts',
  'src/app/book/[[]doctorHandle[]]/page.tsx',
  'src/app/doctor/DoctorDashboardClient.tsx',
  'src/components/BookingContext.tsx',
  'src/components/WaitlistForm.tsx',
  'src/components/booking/BookingModal.tsx',
  'src/components/doctor/AppointmentsList.tsx',
  'src/components/doctor/FinanceModule.tsx',
  'src/components/doctor/PatientCRM.tsx',
  'src/components/doctor/ProfileSettings.tsx',
  'src/components/doctor/ScheduleBuilder.tsx',
  'src/components/doctor/UserManagement.tsx',
];

const legacyUnusedFiles = [
  'src/app/api/admin/finance/route.ts',
  'src/app/api/admin/users/route.ts',
  'src/app/api/public/availability/route.ts',
  'src/app/book/[[]doctorHandle[]]/page.tsx',
  'src/app/doctor/DoctorDashboardClient.tsx',
  'src/app/doctor/login/page.tsx',
  'src/app/doctor/page.tsx',
  'src/app/page.tsx',
  'src/components/BookingContext.tsx',
  'src/components/booking/BookingModal.tsx',
  'src/components/doctor/AppointmentsList.tsx',
  'src/components/doctor/FinanceModule.tsx',
  'src/components/doctor/PatientCRM.tsx',
  'src/components/doctor/ProfileSettings.tsx',
  'src/components/doctor/ScheduleBuilder.tsx',
  'src/components/doctor/StatsDashboard.tsx',
  'src/components/doctor/UserManagement.tsx',
];

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'public/_next/**',
      'coverage/**',
      'next-env.d.ts',
      '*.config.js',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    files: legacyAnyFiles,
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: legacyUnusedFiles,
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: [
      'src/app/book/[[]doctorHandle[]]/page.tsx',
      'src/app/page.tsx',
      'src/components/BookingContext.tsx',
      'src/components/doctor/FinanceModule.tsx',
      'src/components/doctor/PatientCRM.tsx',
    ],
    rules: {
      'react-hooks/exhaustive-deps': 'off',
    },
  },
  {
    files: [
      'src/components/LeadIntakeDemo.tsx',
      'src/components/WaitlistForm.tsx',
      'src/components/doctor/AppointmentsList.tsx',
    ],
    rules: {
      'react/no-unescaped-entities': 'off',
    },
  },
  {
    files: ['src/components/Navbar.tsx'],
    rules: {
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
  {
    files: ['src/components/BookingContext.tsx'],
    rules: {
      'prefer-const': 'off',
    },
  },
  {
    files: [
      'scripts/postbuild.js',
      'scripts/rollback-demo-data.js',
      'scripts/seed-demo-data.js',
      'scripts/seed-users.js',
    ],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
];

export default config;
