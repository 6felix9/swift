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
        "cursor-pointer transition-all duration-200 ease-in-out shadow-md hover:shadow-lg", // Reduced shadow
        "border", // Thinner border
        isSelected ? "border-[#FFB800] bg-gradient-to-br from-[#FFB800]/15 to-transparent scale-102" : "border-gray-700 hover:border-gray-600 bg-gradient-to-br from-gray-800/60 to-gray-900/60",
        "text-white"
      )}
    >
      <CardHeader className="p-2 pb-1"> {/* Reduced padding */}
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{patient.name}</CardTitle> {/* Slightly smaller title */}
          {isSelected && <CheckCircle2 className="w-5 h-5 text-[#FFB800]" />} {/* Smaller check icon */}
        </div>
        <CardDescription className="text-xs text-gray-400 pt-0.5">{patient.age} years old, {patient.gender}</CardDescription> {/* Smaller description text */}
      </CardHeader>
      <CardContent className="p-2 pt-1 space-y-1.5"> {/* Reduced padding and space */}
        <div>
          <h4 className="text-xs font-medium text-gray-300 mb-0.5">NRIC:</h4>
          <p className="text-xs text-gray-400">{patient.nric}</p>
        </div>
        <div>
          <h4 className="text-xs font-medium text-gray-300 mb-0.5">Phone:</h4>
          <p className="text-xs text-gray-400">{mask(patient.phone)}</p>
        </div>
        <div>
          <h4 className="text-xs font-medium text-gray-300 mb-0.5">DOB:</h4>
          <p className="text-xs text-gray-400">{patient.dob}</p>
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
