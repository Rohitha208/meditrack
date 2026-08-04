export interface VitalsValidationErrors {
  temperature?: string;
  heartRate?: string;
  bloodPressure?: string;
  bloodGlucose?: string;
  respiratoryRate?: string;
  capillaryRefill?: string;
  mucousMembrane?: string;
  heartRhythm?: string;
  weight?: string;
  oxygenSaturation?: string;
}

export const validateVitals = (vitals: {
  temperature: string;
  heartRate: string;
  bloodPressure: string;
  bloodGlucose: string;
  respiratoryRate: string;
  capillaryRefill: string;
  mucousMembrane: string;
  heartRhythm: string;
  weight: string;
  oxygenSaturation: string;
}): VitalsValidationErrors => {
  const errors: VitalsValidationErrors = {};
  
  // Temperature validation
  const tempValue = parseFloat(vitals.temperature);
  if (isNaN(tempValue) || tempValue < 32 || tempValue > 43) {
    errors.temperature = 'Temperature must be between 32°C and 43°C';
  }

  // Heart rate validation
  const heartRateValue = parseInt(vitals.heartRate);
  if (isNaN(heartRateValue) || heartRateValue < 30 || heartRateValue > 300) {
    errors.heartRate = 'Heart rate must be between 30 and 300 BPM';
  }

  // Blood pressure validation
  const bpRegex = /^\d{2,3}\/\d{2,3}$/;
  if (!bpRegex.test(vitals.bloodPressure)) {
    errors.bloodPressure = 'Blood pressure must be in format XXX/XXX';
  } else {
    const [systolic, diastolic] = vitals.bloodPressure.split('/').map(Number);
    if (systolic <= 0 || diastolic <= 0) {
      errors.bloodPressure = 'Blood pressure values must be positive';
    } else if (systolic > 300 || diastolic > 200) {
      errors.bloodPressure = 'Blood pressure values are too high';
    } else if (systolic < diastolic) {
      errors.bloodPressure = 'Systolic must be greater than diastolic';
    }
  }

  // Blood glucose validation
  const glucoseValue = parseFloat(vitals.bloodGlucose);
  if (isNaN(glucoseValue) || glucoseValue < 20 || glucoseValue > 800) {
    errors.bloodGlucose = 'Blood glucose must be between 20 and 800 mg/dL';
  }

  // Respiratory rate validation
  const respRateValue = parseInt(vitals.respiratoryRate);
  if (isNaN(respRateValue) || respRateValue < 5 || respRateValue > 60) {
    errors.respiratoryRate = 'Respiratory rate must be between 5 and 60 BPM';
  }

  // Oxygen saturation validation
  const oxygenSatValue = parseFloat(vitals.oxygenSaturation);
  if (isNaN(oxygenSatValue) || oxygenSatValue < 70 || oxygenSatValue > 100) {
    errors.oxygenSaturation = 'Oxygen saturation must be between 70% and 100%';
  }

  // Capillary refill time validation
  const capillaryRefillValue = parseFloat(vitals.capillaryRefill);
  if (isNaN(capillaryRefillValue) || capillaryRefillValue < 0 || capillaryRefillValue > 10) {
    errors.capillaryRefill = 'Capillary refill time must be between 0 and 10 seconds';
  }

  return errors;
};

export const isVitalsComplete = (vitals: {
  temperature: string;
  heartRate: string;
  bloodPressure: string;
  bloodGlucose: string;
  respiratoryRate: string;
  capillaryRefill: string;
  mucousMembrane: string;
  heartRhythm: string;
  weight: string;
  oxygenSaturation: string;
}): boolean => {
  return (
    !!vitals.temperature &&
    !!vitals.heartRate &&
    !!vitals.bloodPressure &&
    !!vitals.bloodGlucose &&
    !!vitals.respiratoryRate &&
    !!vitals.capillaryRefill &&
    !!vitals.mucousMembrane &&
    !!vitals.heartRhythm &&
    !!vitals.weight &&
    !!vitals.oxygenSaturation &&
    Object.keys(validateVitals(vitals)).length === 0
  );
};
