export function calculateAuxiliaryEnergy(input: {
  heatingAuxiliaryKwhYear?: number;
  coolingAuxiliaryKwhYear?: number;
  ventilationAuxiliaryKwhYear?: number;
  dhwAuxiliaryKwhYear?: number;
}) {
  const heating = input.heatingAuxiliaryKwhYear || 0;
  const cooling = input.coolingAuxiliaryKwhYear || 0;
  const ventilation = input.ventilationAuxiliaryKwhYear || 0;
  const dhw = input.dhwAuxiliaryKwhYear || 0;
  return {
    heatingAuxiliaryKwhYear: heating,
    coolingAuxiliaryKwhYear: cooling,
    ventilationAuxiliaryKwhYear: ventilation,
    dhwAuxiliaryKwhYear: dhw,
    totalAuxiliaryKwhYear: heating + cooling + ventilation + dhw
  };
}
