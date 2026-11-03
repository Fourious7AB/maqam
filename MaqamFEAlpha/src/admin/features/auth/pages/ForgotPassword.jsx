import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
export default function ForgotPassword() { return <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl sm:p-9"><h1 className="text-2xl font-extrabold">Reset password</h1><p className="mt-1 text-sm text-slate-500">Backend integration placeholder for Phase 1.</p><div className="mt-7 space-y-5"><Input label="Email" type="email" placeholder="admin@maqam.com"/><Button className="w-full">Send reset link</Button></div></div>; }
