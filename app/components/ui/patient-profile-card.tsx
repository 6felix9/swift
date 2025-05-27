import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { UserCircle, ShieldCheck, Phone, CalendarDays, CreditCard, CheckCircle2 } from 'lucide-react'; // Assuming lucide-react for icons
import clsx from 'clsx';

// Define PatientProfile interface (can be imported from a shared types file)
export interface PatientProfile {
  id: string;
  name: string;
  gender: string; // Added gender
  age: number;    // Added age
  nric: string; // Masked NRIC
  phone: string; // Masked phone number
  dob: string;   // Date of Birth
  outstandingBalance?: string;
}

interface PatientProfileCardProps {
  patient: PatientProfile;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

// Sample phone +65 8288 8399
const mask = (phone: string) => {
  return phone.replace(/\+65 \d\d\d\d/g, '+65 ****');
}

const PatientProfileCard: React.FC<PatientProfileCardProps> = ({ patient, isSelected, onSelect }) => {
  return (
    <Card 
      onClick={() => onSelect(patient.id)}
      className={clsx(
        "cursor-pointer rounded-xl shadow-lg transition-all duration-200 ease-in-out",
        isSelected
          ? "border-2 border-[#FFB800] bg-[#1D3B86]/10 scale-102"
          : "border border-slate-700 bg-slate-800/70 hover:border-slate-600",
        "text-slate-100"
      )}
    >
      <CardHeader className="p-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserCircle className={`w-9 h-9 ${isSelected ? 'text-[#FFB800]' : 'text-slate-500'}`} />
            <div>
              <CardTitle className="text-md font-semibold text-slate-50">{patient.name}</CardTitle>
              <CardDescription className="text-xs text-slate-400">{patient.age} years old, {patient.gender}</CardDescription>
            </div>
          </div>
          {isSelected && <CheckCircle2 className="w-6 h-6 text-[#FFB800]" />}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-3">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-slate-500 flex-shrink-0" />
          <div>
            <h4 className="text-xs font-medium text-slate-400">NRIC</h4>
            <p className="text-sm text-slate-200">{patient.nric}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Phone className="h-5 w-5 text-slate-500 flex-shrink-0" />
          <div>
            <h4 className="text-xs font-medium text-slate-400">Phone</h4>
            <p className="text-sm text-slate-200">{mask(patient.phone)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-slate-500 flex-shrink-0" />
          <div>
            <h4 className="text-xs font-medium text-slate-400">Date of Birth</h4>
            <p className="text-sm text-slate-200">{patient.dob}</p>
          </div>
        </div>
        {patient.outstandingBalance && patient.outstandingBalance !== "None" && (
          <div className="flex items-center gap-3 pt-3 mt-3 border-t border-slate-700">
            <CreditCard className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-medium text-red-400">Outstanding Balance</h4>
              <p className="text-sm font-semibold text-red-300">{patient.outstandingBalance}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export {PatientProfileCard};
