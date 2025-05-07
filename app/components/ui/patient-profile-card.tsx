import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCircle, ShieldCheck, Phone, CalendarDays, CreditCard } from 'lucide-react'; // Assuming lucide-react for icons
import clsx from 'clsx';

// Define PatientProfile interface (can be imported from a shared types file)
export interface PatientProfile {
  id: string;
  name: string;
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
      className={clsx(
        "cursor-pointer transition-all duration-200 ease-in-out w-full max-w-sm shadow-md hover:shadow-lg",
        {
          'border-2 border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50': isSelected,
          'border border-gray-700 hover:border-gray-500 bg-gray-800/50 hover:bg-gray-700/50': !isSelected,
        }
      )}
      onClick={() => onSelect(patient.id)}
    >
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center space-x-3">
          <UserCircle className={`h-8 w-8 ${isSelected ? 'text-blue-400' : 'text-gray-400'}`} />
          <CardTitle className={`text-xl font-semibold ${isSelected ? 'text-white' : 'text-gray-200'}`}>
            {patient.name}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5 text-sm pb-4 pt-0">
        <div className="flex items-center">
          <ShieldCheck className={`h-4 w-4 mr-2.5 ${isSelected ? 'text-blue-400' : 'text-gray-500'}`} />
          <span className={`${isSelected ? 'text-gray-100' : 'text-gray-300'}`}>NRIC: {patient.nric}</span>
        </div>
        <div className="flex items-center">
          <Phone className={`h-4 w-4 mr-2.5 ${isSelected ? 'text-blue-400' : 'text-gray-500'}`} />
          <span className={`${isSelected ? 'text-gray-100' : 'text-gray-300'}`}>Phone: {mask(patient.phone)}</span>
        </div>
        <div className="flex items-center">
          <CalendarDays className={`h-4 w-4 mr-2.5 ${isSelected ? 'text-blue-400' : 'text-gray-500'}`} />
          <span className={`${isSelected ? 'text-gray-100' : 'text-gray-300'}`}>DOB: {patient.dob}</span>
        </div>
        {patient.outstandingBalance && patient.outstandingBalance !== "None" && (
          <div className="flex items-center mt-1.5">
            <CreditCard className={`h-4 w-4 mr-2.5 ${isSelected ? 'text-red-400' : 'text-red-500'}`} />
            <span className={`${isSelected ? 'text-red-200' : 'text-red-400'} font-semibold`}>
              Outstanding: {patient.outstandingBalance}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export {PatientProfileCard};
