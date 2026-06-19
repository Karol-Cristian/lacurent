# 09 DHW Systems

Source document:

- `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`

MC001 sections used:

- MC001-2022, 3.3 - Instalatii pentru apa calda de consum
- MC001-2022, 3.3.3 - Consumul de energie pentru instalatiile de apa calda de consum
- MC001-2022, 3.3.5 - Temperaturi specifice sistemului de apa calda de consum
- MC001-2022, 3.3.6 - Necesarul de caldura pentru prepararea apei calde de consum furnizata utilizatorului, `QW,nd`
- MC001-2022, 3.3.6.1 - Necesarul volumic zilnic de apa calda de consum `VW;day`
- MC001-2022, 3.3.7.2 - Pierderi de distributie, relations (3.200)-(3.213)
- MC001-2022, 3.3.7.3 - Pierderi termice recuperabile ale distributiei, relations (3.214)-(3.216)
- MC001-2022, 3.3.7.4 - Energie auxiliara a distributiei pentru apa calda de consum, relations (3.217)-(3.224)
- MC001-2022, Tabel 3.3.1

Extraction status: `extracted`

Implementation relevance:

- Useful DHW demand and residential DHW volume formulas are now extracted.
- Key DHW temperature defaults are extracted as data notes.
- DHW distribution loss formulas are extracted through recoverable distribution heat.
- DHW auxiliary distribution energy formulas are extracted through relation (3.224).
- Tabel 3.3.1 remains indexed, not fully copied.
- Useful DHW energy remains separate from final DHW system energy.

LaCurent disclaimer:

- This extraction supports a MC001-like Physics Engine.
- It is not sufficient for issuing an official energy performance certificate.
- Calculators must still preserve source, assumptions, warnings, and CalculationTrace.

## Concepts to extract

Apa calda de consum / DHW:

- Hot water used for domestic or building service needs, separate from space heating.
- In LaCurent it must be modelled as a separate energy use because it may have a separate system, storage, distribution, fuel carrier, and efficiency.

Useful energy demand for DHW:

- The useful thermal energy needed to raise the required water volume from cold-water temperature to DHW draw-off/use temperature.
- This is before distribution, storage, generation, and auxiliary losses.

Delivered/final energy for DHW:

- The final energy consumed by the DHW system to deliver useful DHW energy.
- It depends on system generation, storage, distribution, circulation, control, and auxiliary terms where MC001 defines them.

Cold water temperature:

- Temperature of incoming cold water used in DHW useful energy calculation.

DHW draw-off/use temperature:

- Temperature at the user draw-off point. MC001 extracts a minimum and recommended value in 3.3.5.

Daily DHW volume:

- Daily hot water volume used by the useful energy formula.
- Residential default volume is based on equivalent consumers and specific daily demand.
- Non-residential/default-by-use volume depends on Tabel 3.3.1.

Distribution/storage/generation losses:

- Losses between generation and point of use, including distribution pipes, storage tanks, circulation loops, and generation conversion losses where defined by MC001.

Useful DHW demand vs final energy:

- Useful DHW demand is the water heating requirement.
- Final DHW energy is the energy consumed by the technical system to satisfy that demand.
- These must remain separate in the Physics Engine.

## Formula registry entries

### Formula 1 - Useful DHW energy

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_188_DHW_USEFUL_ENERGY` |
| labelRo | Necesar de caldura util pentru apa calda de consum |
| formulaText | `QW,nd = Vt x cW x rhoW x (thetaW,draw - thetaW,c) / 1000` |
| unit | `kWh per timestep` |
| output | `QWnd` |
| inputs | `Vt`: volume of DHW for the calculation timestep; `cW`: specific heat of water; `rhoW`: water density; `thetaWDraw`: draw-off/use temperature; `thetaWC`: cold water temperature |
| MC001 reference | MC001-2022, 3.3.6, relatia (3.188) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Document clearly whether `Vt` is litres or `m3` in the source text. Unit conversion must be handled explicitly before implementation. Do not infer DHW volume from useful area unless MC001 formula explicitly allows it. |
| validation notes | `Vt`, `cW`, and `rhoW` must be positive. The denominator/unit conversion must be traced. Temperature difference must be numeric. |

### Formula 2 - Daily DHW volume, residential

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_189_DHW_DAILY_VOLUME_RESIDENTIAL` |
| labelRo | Necesar volumic zilnic ACC pentru locuinte |
| formulaText | `VW,day = VW,P,day x nP` |
| unit | `l/zi` |
| output | `VWDay` |
| inputs | `VWPDay`: specific daily DHW demand per equivalent person; `nP`: number of equivalent persons / consumers |
| MC001 reference | MC001-2022, 3.3.6.1, relatia (3.189) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Residential DHW volume uses equivalent consumers and specific daily residential demand. |
| validation notes | `VWPDay >= 0`; `nP >= 0`. |

### Formula 3 - Daily DHW volume, non-residential / other buildings

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_190_DHW_DAILY_VOLUME_NON_RESIDENTIAL` |
| labelRo | Necesar volumic zilnic ACC pentru alte destinatii |
| formulaText | `VW,day = VW,f,day x f` |
| unit | `l/zi` |
| output | `VWDay` |
| inputs | `VWFDay`: specific daily DHW demand for the building destination/use; `f`: unit count / reference quantity for that destination |
| MC001 reference | MC001-2022, 3.3.6.1, relatia (3.190) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Requires Tabel 3.3.1 lookup for destination/use-specific DHW demand. |
| validation notes | `VWFDay >= 0`; `f >= 0`. |

### Formula 4 - Temperature correction for specific daily DHW volume

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_191_DHW_VOLUME_TEMPERATURE_CORRECTION` |
| labelRo | Corectia necesarului specific zilnic ACC in functie de temperaturi |
| formulaText | `VW,f,day = VW,f,day,norme x (thetaW - thetaW,c) / (thetaW,draw - thetaW,c)` |
| unit | `l/unitate,zi` |
| output | `VWFDayCorrected` |
| inputs | `VWFDayNorme`: normative specific daily demand; `thetaW`: DHW reference/network temperature; `thetaWC`: cold water temperature; `thetaWDraw`: draw-off/use temperature |
| MC001 reference | MC001-2022, 3.3.6.1, relatia (3.191) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | The MC001 text gives an example using `(60 - 13.50) / (45 - 10)`. Keep temperature symbols documented. |
| validation notes | Denominator `thetaW,draw - thetaW,c` must not be zero. Temperatures must be numeric. |

### Formula 5 - Equivalent consumers, single-family houses: maximum

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_192_NP_EQ_MAX_SINGLE_FAMILY` |
| labelRo | Numar maxim echivalent de consumatori pentru locuinta individuala |
| formulaText | `nP,eq,max = 1 daca Ah < 30 m2; nP,eq,max = 1.75 - 0.01875 x (70 - Ah) daca 30 m2 <= Ah < 70 m2; nP,eq,max = 0.025 x Ah daca Ah >= 70 m2` |
| unit | `-` |
| output | `nPEqMax` |
| inputs | `Ah`: living/heated useful area as defined by MC001 context |
| MC001 reference | MC001-2022, 3.3.6.1, relatia (3.192) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Applies to single-family houses. |
| validation notes | `Ah > 0`; branch boundaries must preserve MC001 inclusivity. |

### Formula 6 - Equivalent consumers, single-family houses

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_193_NP_EQ_SINGLE_FAMILY` |
| labelRo | Numar echivalent de consumatori pentru locuinta individuala |
| formulaText | `nP,eq = nP,eq,max daca nP,eq,max < 1.75; nP,eq = 1.75 + 0.3 x (nP,eq,max - 1.75) daca nP,eq,max >= 1.75` |
| unit | `-` |
| output | `nPEq` |
| inputs | `nPEqMax`: maximum equivalent consumers for single-family house |
| MC001 reference | MC001-2022, 3.3.6.1, relatia (3.193) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Use after relation (3.192). |
| validation notes | `nPEqMax >= 0`; branch boundary at `1.75`. |

### Formula 7 - Equivalent consumers, apartments: maximum

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_194_NP_EQ_MAX_APARTMENT` |
| labelRo | Numar maxim echivalent de consumatori pentru apartament |
| formulaText | `nP,eq,max = 1 daca Ah < 10 m2; nP,eq,max = 1.75 - 0.01875 x (50 - Ah) daca 10 m2 <= Ah < 50 m2; nP,eq,max = 0.035 x Ah daca Ah >= 50 m2` |
| unit | `-` |
| output | `nPEqMax` |
| inputs | `Ah`: living/heated useful area as defined by MC001 context |
| MC001 reference | MC001-2022, 3.3.6.1, relatia (3.194) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Applies to apartments. |
| validation notes | `Ah > 0`; branch boundaries must preserve MC001 inclusivity. |

### Formula 8 - Equivalent consumers, apartments

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_195_NP_EQ_APARTMENT` |
| labelRo | Numar echivalent de consumatori pentru apartament |
| formulaText | `nP,eq = nP,eq,max daca nP,eq,max < 1.75; nP,eq = 1.75 + 0.3 x (nP,eq,max - 1.75) daca nP,eq,max >= 1.75` |
| unit | `-` |
| output | `nPEq` |
| inputs | `nPEqMax`: maximum equivalent consumers for apartment |
| MC001 reference | MC001-2022, 3.3.6.1, relatia (3.195) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Use after relation (3.194). |
| validation notes | `nPEqMax >= 0`; branch boundary at `1.75`. |

### Formula 9 - Specific DHW volume for residential buildings

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_196_DHW_SPECIFIC_VOLUME_RESIDENTIAL` |
| labelRo | Necesar specific zilnic ACC pentru locuinte |
| formulaText | `VW,P,day = min(x, y x Ah / nP,eq)` |
| unit | `l/(persoana echivalenta, zi)` |
| output | `VWPDay` |
| inputs | `x = 40.71`; `y = 3.26`; `Ah`: living/heated useful area as defined by MC001 context; `nPEq`: equivalent consumers |
| MC001 reference | MC001-2022, 3.3.6.1, relatia (3.196) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | `x` and `y` are MC001 coefficients for residential DHW. Do not use `Ah` alone; `nP,eq` must be calculated. |
| validation notes | `Ah > 0`; `nPEq > 0`; coefficients must be traced as MC001 values. |

### Formula 10 - Mean DHW distribution temperature

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_200_DHW_MEAN_DISTRIBUTION_TEMPERATURE` |
| labelRo | Temperatura medie a sistemului de distributie ACC |
| formulaText | `thetaW,mean = thetaW - deltaThetaW / 2` |
| unit | `degC` |
| output | `thetaWMean` |
| inputs | `thetaW`: DHW distribution/network temperature; `deltaThetaW`: temperature difference/loss term |
| MC001 reference | MC001-2022, 3.3.7.2, relatia (3.200) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | First confirmed distribution-related formula. Distribution losses continue in relations (3.201)-(3.216). |
| validation notes | Temperatures must be numeric. |

### Formula 11 - Linear thermal transmittance, insulated pipe

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_201_DHW_LINEAR_TRANSMITTANCE_INSULATED_PIPE` |
| labelRo | Transmitanta termica liniara pentru tevi izolate in spatii deschise |
| formulaText | `Psi = pi / ((1 / (2 x lambdaD)) x ln(da / di) + 1 / (ha x da))` |
| unit | `W/(mK)` |
| output | `Psi` |
| inputs | `di`: interior diameter of the pipe without insulation [m]; `da`: exterior diameter of the pipe without insulation [m]; `ha`: global exterior heat transfer coefficient, convection plus radiation [W/m2K]; `lambdaD`: insulation thermal conductivity [W/mK] |
| MC001 reference | MC001-2022, 3.3.7.2, relatia (3.201) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Applies to insulated DHW distribution pipes in open spaces. Pipe and insulation geometry must be explicit. |
| validation notes | Diameters, `ha`, and `lambdaD` must be positive. `da > di`. |

### Formula 12 - Linear thermal transmittance, buried pipe

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_202_DHW_LINEAR_TRANSMITTANCE_BURIED_PIPE` |
| labelRo | Transmitanta termica liniara pentru tevi ingropate |
| formulaText | `Psiem = pi / ((1 / (2 x lambdaD)) x ln(da / di) + (1 / (2 x lambdaem)) x ln(4 x z / da))` |
| unit | `W/(mK)` |
| output | `Psiem` |
| inputs | `di`: interior diameter of the pipe without insulation [m]; `da`: exterior diameter of the pipe without insulation [m]; `z`: burial depth from ground surface [m]; `lambdaD`: insulation thermal conductivity [W/mK]; `lambdaem`: thermal conductivity of burial material [W/mK] |
| MC001 reference | MC001-2022, 3.3.7.2, relatia (3.202) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Applies to buried DHW pipes. Burial material conductivity and depth must be sourced. |
| validation notes | Diameters, `z`, `lambdaD`, and `lambdaem` must be positive. Logarithm arguments must be positive. |

### Formula 13 - Linear thermal transmittance, uninsulated pipe

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_203_DHW_LINEAR_TRANSMITTANCE_UNINSULATED_PIPE` |
| labelRo | Transmitanta termica liniara pentru tevi neizolate |
| formulaText | `Psinon = pi / ((1 / (2 x lambdap)) x ln(dp,a / dp,i) + 1 / (ha x dp,a))` |
| unit | `W/(mK)` |
| output | `Psinon` |
| inputs | `dp,i`: interior diameter of the uninsulated pipe [m]; `dp,a`: exterior diameter of the uninsulated pipe [m]; `ha`: global exterior heat transfer coefficient, convection plus radiation [W/m2K]; `lambdap`: pipe thermal conductivity [W/mK] |
| MC001 reference | MC001-2022, 3.3.7.2, relatia (3.203) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Applies to uninsulated DHW pipes when pipe conductivity and diameters are known. |
| validation notes | Diameters, `ha`, and `lambdap` must be positive. `dp,a > dp,i`. |

### Formula 14 - Linear thermal transmittance, uninsulated pipe approximation

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_204_DHW_LINEAR_TRANSMITTANCE_UNINSULATED_APPROX` |
| labelRo | Calcul aproximativ al transmitantei termice liniare pentru tevi neizolate |
| formulaText | `Psinon = ha x pi x dp,a` |
| unit | `W/(mK)` |
| output | `Psinon` |
| inputs | `ha`: global exterior heat transfer coefficient, convection plus radiation [W/m2K]; `dp,a`: exterior diameter of the uninsulated pipe [m] |
| MC001 reference | MC001-2022, 3.3.7.2, relatia (3.204) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Approximate route for uninsulated pipes. The use of this approximation must be traced. |
| validation notes | `ha > 0`; `dp,a > 0`. |

### Formula 15 - Distribution loss with recirculation

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_205_DHW_DISTRIBUTION_LOSS_WITH_RECIRCULATION` |
| labelRo | Pierderi termice ale conductelor de distributie cu recirculare ACC |
| formulaText | `QW,dis,ls = (1 / 1000) x sum_t=0..tW,op sum_j Psi_j x (thetaW,mean - thetaW,amb,j) x (L + Lequip)_j x tci` |
| unit | `kWh` |
| output | `QWDisLs` |
| inputs | `Psi_j`: linear thermal transmittance for pipe j [W/mK]; `thetaWMean`: mean DHW temperature in distribution/recirculation pipes [degC]; `thetaWAmbJ`: ambient temperature around pipe zone j [degC]; `L`: distribution pipe length in zone j [m]; `Lequip`: equivalent length for local pressure losses in zone j [m]; `tci`: calculation timestep interval [h]; `tWop`: total DHW recirculation operation time [h] |
| MC001 reference | MC001-2022, 3.3.7.2, relatia (3.205) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Applies to DHW distribution pipes with recirculation during DHW supply. The 1/1000 factor converts W*h to kWh. |
| validation notes | Lengths, timestep, and operation time must be non-negative. Temperatures and `Psi_j` must be numeric. |

### Formula 16 - Stub loss without recirculation

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_206_DHW_STUB_LOSS_WITHOUT_RECIRCULATION` |
| labelRo | Pierderi termice ale conductelor fara recirculare, stub |
| formulaText | `QW,dis,ls,stub = (sum_j Vstub,j x rhoW x ntap,j) x cW x (thetaW - thetaW,amb,j) x tci` |
| unit | `kWh` |
| output | `QWDisLsStub` |
| inputs | `Vstub,j`: volume of open-circuit pipe segment for zone j [m3]; `rhoW`: water density [kg/m3]; `ntap,j`: number of uses at draw-off point for zone j and timestep [1/h]; `cW`: water specific heat [kWh/kgK]; `thetaW`: DHW temperature [degC]; `thetaWAmbJ`: ambient temperature around pipe zone j [degC]; `tci`: calculation timestep interval [h] |
| MC001 reference | MC001-2022, 3.3.7.2, relatia (3.206) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Applies to open-circuit stub pipe portions where water stagnates between successive uses. Zone-indexed terms must be implemented consistently with the MC001 summation. |
| validation notes | Volumes, density, use count, and timestep must be non-negative. Temperatures must be numeric. |

### Formula 17 - Recirculation loss without draw-off

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_207_DHW_RECIRCULATION_LOSS_WITHOUT_DRAWOFF` |
| labelRo | Pierderi termice ale conductelor cu recirculare in absenta consumului ACC |
| formulaText | `QW,dis,ls,nom = (1 / 1000) x sum_t=0..tW,op sum_j Psi_j x (thetaW,avg + thetaW,amb,j) x (L + Lequi)_j x tci` |
| unit | `kWh` |
| output | `QWDisLsNom` |
| inputs | `Psi_j`: linear thermal transmittance for pipe j [W/mK]; `thetaWAvg`: mean DHW temperature without draw-off [degC]; `thetaWAmbJ`: ambient temperature around pipe zone j [degC]; `L`: distribution pipe length in zone j [m]; `Lequi`: equivalent pipe length in zone j [m]; `tci`: calculation timestep interval [h]; `tWop`: total DHW recirculation operation time [h] |
| MC001 reference | MC001-2022, 3.3.7.2, relatia (3.207) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | The visual formula shows a plus sign between `thetaW,avg` and `thetaW,amb,j`; preserve this extraction exactly and verify physical interpretation before calculator implementation. `thetaW,avg` is defined by subsequent relations (3.208)-(3.212). |
| validation notes | Lengths, timestep, and operation time must be non-negative. Temperatures and `Psi_j` must be numeric. |

### Formula 18 - Specific linear heat loss for average-temperature calculation

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_208_DHW_SPECIFIC_LINEAR_HEAT_LOSS` |
| labelRo | Pierdere termica specifica liniara pentru determinarea temperaturii medii |
| formulaText | `qi = Psi_i x (thetaW - thetaW,amb,j)` |
| unit | `W/m` |
| output | `qi` |
| inputs | `Psi_i`: linear thermal transmittance for pipe i [W/mK]; `thetaW`: DHW temperature [degC]; `thetaWAmbJ`: ambient temperature around pipe zone j [degC] |
| MC001 reference | MC001-2022, 3.3.7.2, relatia (3.208) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Supporting relation for determining `thetaW,avg` used by relation (3.207). |
| validation notes | `Psi_i` and temperatures must be numeric. |

### Formula 19 - Exponential coefficient for cooling after non-use

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_209_DHW_EXPONENTIAL_COEFFICIENT` |
| labelRo | Coeficient exponential pentru racirea apei dupa neutilizare |
| formulaText | `Ci = (qi x Li) / (cW x rhoW x Vi + cp x mp,i) x (tatap / (thetaW - thetaW,amb,i))` |
| unit | `-` |
| output | `Ci` |
| inputs | `qi`: specific linear heat loss [W/m]; `Li`: pipe segment length [m]; `cW`: water specific heat [kWh/kgK]; `rhoW`: water density [kg/m3]; `Vi`: water volume in segment i [m3]; `cp`: specific heat of the pipe material [kWh/kgK]; `mp,i`: effective pipe segment mass excluding contained water [kg]; `tatap`: duration between DHW uses [h]; `thetaW`: DHW temperature [degC]; `thetaWAmbI`: ambient temperature for segment i [degC] |
| MC001 reference | MC001-2022, 3.3.7.2, relatia (3.209) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Supporting relation for determining `thetaW,avg`. Unit consistency must be checked before implementation because MC001 mixes heat loss and heat capacity terms. |
| validation notes | Denominators must not be zero. Heat capacities, volumes, density, length, and duration must be non-negative. |

### Formula 20 - DHW temperature after non-use interval

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_210_DHW_TEMPERATURE_AFTER_NONUSE_INTERVAL` |
| labelRo | Temperatura apei dupa un interval de neutilizare |
| formulaText | `thetaW,dis,atap,i = thetaW,ah,j + (thetaWavg,begin - thetaW,amb,j) x e^(-Ci)` |
| unit | `degC` |
| output | `thetaWDisAtapI` |
| inputs | `thetaWAhJ`: first temperature term as shown in the source formula; `thetaWAvgBegin`: beginning average DHW temperature [degC]; `thetaWAmbJ`: ambient temperature around pipe zone j [degC]; `Ci`: exponential coefficient [-] |
| MC001 reference | MC001-2022, 3.3.7.2, relatia (3.210) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Supporting relation for determining `thetaW,avg`. The first temperature symbol is transcribed visually as `thetaW,ah,j`; verify symbol semantics before calculator implementation. |
| validation notes | Temperatures and `Ci` must be numeric. |

### Formula 21 - Average DHW temperature from consumption profile

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_211_DHW_AVERAGE_TEMPERATURE_PROFILE` |
| labelRo | Temperatura medie ACC cand profilul de consum este cunoscut |
| formulaText | `thetaW,avg = (thetaWavg,begin + thetaW,dis,atap) / 2` |
| unit | `degC` |
| output | `thetaWAvg` |
| inputs | `thetaWAvgBegin`: beginning average DHW temperature [degC]; `thetaWDisAtap`: DHW temperature after non-use interval [degC] |
| MC001 reference | MC001-2022, 3.3.7.2, relatia (3.211) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Used when DHW consumption profile is known. |
| validation notes | Temperatures must be numeric. |

### Formula 22 - Simplified average DHW temperature

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_212_DHW_AVERAGE_TEMPERATURE_SIMPLIFIED` |
| labelRo | Temperatura medie ACC simplificata |
| formulaText | `thetaW,avg = 25 x Psi^(-0.2)` |
| unit | `degC` |
| output | `thetaWAvg` |
| inputs | `Psi`: linear thermal transmittance [W/mK] |
| MC001 reference | MC001-2022, 3.3.7.2, relatia (3.212) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Simplified method used for an hourly calculation timestep. |
| validation notes | `Psi` must be positive. |

### Formula 23 - Total DHW distribution loss

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_213_DHW_TOTAL_DISTRIBUTION_LOSS` |
| labelRo | Pierderi termice totale ale distributiei ACC |
| formulaText | `QW,dis,ls,total = QW,dis,ls + QW,dis,ls,nom + QW,dis,ls,stub` |
| unit | `kWh` |
| output | `QWDisLsTotal` |
| inputs | `QWDisLs`: distribution and recirculation loss during DHW supply [kWh]; `QWDisLsNom`: recirculation loss without draw-off [kWh]; `QWDisLsStub`: stub loss without recirculation [kWh] |
| MC001 reference | MC001-2022, 3.3.7.2, relatia (3.213) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Aggregates the three distribution loss components. |
| validation notes | Component losses must be non-negative. |

### Formula 24 - Recoverable DHW distribution loss in conditioned spaces

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_214_DHW_RECOVERABLE_DISTRIBUTION_LOSS` |
| labelRo | Pierderi termice recuperabile ale distributiei ACC in spatii climatizate |
| formulaText | `QW,dis,ls,condispace = (1 / 1000) x sum_t=0..tW,op sum_j Psi_j x (thetaW,mean - thetaW,amb,j) x (Lcondispace + Lequip)_j x tci` |
| unit | `kWh` |
| output | `QWDisLsCondispace` |
| inputs | `Psi_j`: linear thermal transmittance for pipe j [W/mK]; `thetaWMean`: mean DHW temperature in distribution pipes [degC]; `thetaWAmbJ`: ambient temperature around pipe zone j [degC]; `Lcondispace`: pipe length crossing conditioned spaces [m]; `Lequip`: equivalent pipe length in zone j [m]; `tci`: calculation timestep interval [h]; `tWop`: total DHW recirculation operation time [h] |
| MC001 reference | MC001-2022, 3.3.7.3, relatia (3.214) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Recoverable loss is calculated only for distribution pipe length crossing conditioned spaces. |
| validation notes | Lengths, timestep, and operation time must be non-negative. Temperatures and `Psi_j` must be numeric. |

### Formula 25 - DHW distribution recovery factor

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_215_DHW_RECOVERY_FACTOR` |
| labelRo | Factor de recuperare a pierderilor termice ale distributiei ACC |
| formulaText | `fW,dis,ls,rbl = QW,dis,ls,condispace / QW,dis,ls,total` |
| unit | `-` |
| output | `fWDisLsRbl` |
| inputs | `QWDisLsCondispace`: recoverable distribution loss in conditioned spaces [kWh]; `QWDisLsTotal`: total DHW distribution loss [kWh] |
| MC001 reference | MC001-2022, 3.3.7.3, relatia (3.215) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Calculates the fraction of total DHW distribution loss that is recoverable. |
| validation notes | `QWDisLsTotal` must be greater than zero. Losses must be non-negative. |

### Formula 26 - Recovered DHW distribution heat

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_216_DHW_RECOVERED_DISTRIBUTION_HEAT` |
| labelRo | Energie termica recuperabila din pierderile distributiei ACC |
| formulaText | `QW,dis,ls,rbl = fW,dis,ls,rbl x QW,dis,ls,total` |
| unit | `kWh` |
| output | `QWDisLsRbl` |
| inputs | `fWDisLsRbl`: DHW distribution recovery factor [-]; `QWDisLsTotal`: total DHW distribution loss [kWh] |
| MC001 reference | MC001-2022, 3.3.7.3, relatia (3.216) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Recovered distribution heat remains separate from gross distribution loss and must be traced separately. |
| validation notes | Recovery factor and total loss must be non-negative. |

### Formula 27 - DHW pump design power

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_217_DHW_PUMP_DESIGN_POWER` |
| labelRo | Puterea proiectata a pompelor de recirculare ACC |
| formulaText | `PW,hydr,des = deltaPW,des x VdotW,des / 3600` |
| unit | `kW` |
| output | `PWHydrDes` |
| inputs | `deltaPWDes`: pressure drop on the DHW distribution and recirculation circuit, design value [kPa]; `VdotWDes`: DHW flow rate, design value [m3/h] |
| MC001 reference | MC001-2022, 3.3.7.4, relatia (3.217) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Converts hydraulic pressure drop and design flow to pump design power. Unit conversion must be traced. |
| validation notes | `deltaPWDes >= 0`; `VdotWDes >= 0`. |

### Formula 28 - DHW pressure drop

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_218_DHW_PRESSURE_DROP` |
| labelRo | Pierderea de sarcina a circuitului inchis de distributie ACC |
| formulaText | `deltaPW,des = (1 + fcomp) x RW,max x Lmax + deltaPW,add` |
| unit | `kPa` |
| output | `deltaPWDes` |
| inputs | `fcomp`: component resistance factor [-]; `RWMax`: linear pressure drop on the most disadvantaged circuit [kPa/m]; `Lmax`: maximum length of the most disadvantaged distribution circuit [m]; `deltaPWAdd`: local pressure drop from additional hydraulic resistances [kPa] |
| MC001 reference | MC001-2022, 3.3.7.4, relatia (3.218) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | MC001 cites conventional `fcomp` values for usual distribution networks and networks with many direction changes. `RWMax` and `deltaPWAdd` depend on referenced SR EN 15316-3 annex tables and must be sourced before implementation. |
| validation notes | `fcomp >= 0`; `RWMax >= 0`; `Lmax >= 0`; `deltaPWAdd >= 0`. |

### Formula 29 - DHW recirculation pump energy

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_219_DHW_RECIRCULATION_PUMP_ENERGY` |
| labelRo | Necesarul de energie electrica al pompei de recirculare ACC |
| formulaText | `WW,dis,hydr,an = PW,hydr,des x betaW,dis x tW,op,an x fW,corr` |
| unit | `kWh` |
| output | `WWDisHydrAn` |
| inputs | `PWHydrDes`: design power of recirculation pumps [kW]; `betaWDis`: operation/load factor at partial load [-]; `tWOpAn`: distribution system operation time [h]; `fWCorr`: correction factor for special distribution system design conditions [-] |
| MC001 reference | MC001-2022, 3.3.7.4, relatia (3.219) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | MC001 defines `fW,corr = fHB x fspecial`; hydraulic balancing and special-condition factors must be sourced and traced. |
| validation notes | `PWHydrDes >= 0`; `0 <= betaWDis <= 1`; `tWOpAn >= 0`; `fWCorr >= 0`. |

### Formula 30 - DHW auxiliary distribution energy

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_220_DHW_AUXILIARY_DISTRIBUTION_ENERGY` |
| labelRo | Consum de energie auxiliara pentru distributia ACC |
| formulaText | `WW,dis,an = WW,dis,hydr,an x epsilonW,dis` |
| unit | `kWh` |
| output | `WWDisAn` |
| inputs | `WWDisHydrAn`: recirculation pump energy calculated previously [kWh]; `epsilonWDis`: energy use factor of distribution pumps [-] |
| MC001 reference | MC001-2022, 3.3.7.4, relatia (3.220) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Applies the pump energy use factor to previously calculated recirculation pump energy. |
| validation notes | `WWDisHydrAn >= 0`; `epsilonWDis >= 0`. |

### Formula 31 - DHW pump energy use factor

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_221_DHW_PUMP_ENERGY_USE_FACTOR` |
| labelRo | Factorul de utilizare a energiei pompelor de distributie ACC |
| formulaText | `epsilonW,dis = fW,e x (CP1 + CP2 x betaW,dis^-1) x EEI / 0.25` |
| unit | `-` |
| output | `epsilonWDis` |
| inputs | `fWE`: efficiency factor [-]; `CP1`: pump control-system constant [-]; `CP2`: pump control-system constant [-]; `betaWDis`: operation/load factor at partial load [-]; `EEI`: energy efficiency index [-] |
| MC001 reference | MC001-2022, 3.3.7.4, relatia (3.221) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | `CP1`, `CP2`, and `EEI` are referenced from SR EN 15316-3 / related annex data and must not be invented. |
| validation notes | `betaWDis` must be greater than zero. `fWE`, `EEI`, `CP1`, and `CP2` must be numeric. |

### Formula 32 - DHW pump efficiency factor

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_222_DHW_PUMP_EFFICIENCY_FACTOR` |
| labelRo | Factorul de eficienta al pompei ACC |
| formulaText | `fW,e = PW,ref / PW,hydr,des` |
| unit | `-` |
| output | `fWE` |
| inputs | `PWRef`: pump reference power [kW]; `PWHydrDes`: design hydraulic pump power [kW] |
| MC001 reference | MC001-2022, 3.3.7.4, relatia (3.222) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | General efficiency factor for DHW recirculation pump calculation. |
| validation notes | `PWHydrDes` must be greater than zero. `PWRef >= 0`. |

### Formula 33 - DHW reference pump power

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_223_DHW_REFERENCE_PUMP_POWER` |
| labelRo | Puterea de referinta a pompei ACC |
| formulaText | `PW,ref = (1.7 x PW,hydr,des + 17 x (1 - e^(-0.3 x PW,hydr,des))) x 10^-3` |
| unit | `kW` |
| output | `PWRef` |
| inputs | `PWHydrDes`: design hydraulic pump power [kW] |
| MC001 reference | MC001-2022, 3.3.7.4, relatia (3.223) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | MC001 states this applies to wet running recirculation pumps in the indicated hydraulic design power interval. Existing installations may use nameplate electrical power as reference power where allowed by the text. |
| validation notes | `PWHydrDes >= 0`; applicability interval must be checked before using this relation. |

### Formula 34 - DHW heat tracing auxiliary energy

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_224_DHW_HEAT_TRACING_AUXILIARY_ENERGY` |
| labelRo | Energie auxiliara pentru cabluri electrice incalzitoare ACC |
| formulaText | `WW,dis,rib = QW,dis,ls` |
| unit | `kWh` |
| output | `WWDisRib` |
| inputs | `QWDisLs`: heat loss of DHW distribution pipe lengths protected with heating cable [kWh] |
| MC001 reference | MC001-2022, 3.3.7.4, relatia (3.224) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Applies to electric heating cables used in DHW distribution. The source continues with relation (3.225) for `QW,dis,ls`, but relation (3.225) is outside the requested extraction scope for this task. |
| validation notes | `QWDisLs >= 0`. |

## Tabel 3.3.1

| dataKey | Value |
| --- | --- |
| dataKey | `specificDhwConsumptionByBuildingUse` |
| MC001 source | MC001-2022, Tabel 3.3.1 |
| title | Valorile necesarului specific de apa calda de consum pentru diferite destinatii de cladiri |
| unit | `l/unitate,zi la 60 degC` |
| lookup key | building destination/use category |
| neededFor | Formula (3.190), `MC001_3_190_DHW_DAILY_VOLUME_NON_RESIDENTIAL` |
| extractionStatus | `indexed_table` |
| implementationAllowed | `false` |
| notes | The table is identified and required for non-residential/other-use DHW volume. Values are not copied in this pass, so implementation must wait until values are extracted. |

## Temperature defaults from 3.3.5

Extracted data notes, not formulas:

| dataKey | Value | Unit | MC001 source | extractionStatus | implementationAllowed | notes |
| --- | ---: | --- | --- | --- | --- | --- |
| `thetaWCold` | 10 | `degC` | MC001-2022, 3.3.5 | `extracted` | `true` | Default cold water temperature. More exact calculation may use annual average exterior air temperature where MC001 allows it. |
| `thetaW` | 60 | `degC` | MC001-2022, 3.3.5 | `extracted` | `true` | Recommended for DHW distribution network. |
| `thetaWSto` | 60 | `degC` | MC001-2022, 3.3.5 | `extracted` | `true` | Recommended for storage. |
| `thetaWDloop` | 60 | `degC` | MC001-2022, 3.3.5 | `extracted` | `true` | Recommended for distribution loop. |
| `deltaThetaWDloop` | 2-10 | `degC` | MC001-2022, 3.3.5 | `extracted` | `true` | Range for loop temperature difference. |
| `deltaThetaWDloopRecommended` | 5 | `degC` | MC001-2022, 3.3.5 | `extracted` | `true` | Recommended loop temperature difference. |
| `thetaWDrawMinimum` | 42 | `degC` | MC001-2022, 3.3.5 | `extracted` | `true` | Minimum draw-off/use temperature. |
| `thetaWDrawRecommended` | 45 | `degC` | MC001-2022, 3.3.5 | `extracted` | `true` | Recommended draw-off/use temperature. |

## Required data/tables

| dataKey | neededFor | MC001 source | unit | extractionStatus | implementationAllowed | notes |
| --- | --- | --- | --- | --- | --- | --- |
| `dhwVolume` | useful DHW demand | MC001-2022, 3.3.6.1, relations (3.189), (3.190) | `l/zi` or timestep volume | `extracted` | `true` | Residential and non-residential daily volume formulas are extracted. |
| `numberOfOccupants` / `nP` | residential DHW volume | MC001-2022, 3.3.6.1, relation (3.189) | persons/equivalent consumers | `extracted` | `true` | Residential method uses equivalent consumers. |
| `buildingUseCategory` | non-residential DHW volume | MC001-2022, Tabel 3.3.1 | category id | `indexed_table` | `false` | Table values must be extracted before implementation for non-residential defaults. |
| `coldWaterTemperature` | useful DHW demand | MC001-2022, 3.3.5 | `degC` | `extracted` | `true` | Default `thetaWCold = 10 degC`; more exact route may use annual average exterior air temperature where MC001 allows it. |
| `hotWaterTemperature` / `thetaWDraw` | useful DHW demand | MC001-2022, 3.3.5 | `degC` | `extracted` | `true` | Minimum 42 degC; recommended 45 degC. |
| `specificDhwConsumption` | DHW volume/default demand | MC001-2022, relation (3.196) for residential; Tabel 3.3.1 for other uses | `l/(persoana echivalenta, zi)` or `l/unitate,zi` | `partial` | `false` | Residential coefficients are extracted; non-residential values remain table-indexed only. |
| `distributionLosses` | DHW final energy/losses | MC001-2022, 3.3.7, relations (3.201)-(3.224) | `kWh`, `W`, or MC001-defined unit | `extracted` | `true` | Distribution loss, recoverable heat, and auxiliary distribution energy relations (3.201)-(3.224) are extracted. Tabel 3.3.1 values remain indexed, not copied. |
| `storageLosses` | DHW final energy/losses | MC001-2022, DHW storage/system sections | `kWh`, `W`, or MC001-defined unit | `pending_extraction` | `false` | Storage losses remain pending. |
| `generationEfficiency` | DHW final energy/system conversion | MC001-2022 DHW system/final energy sections | `-` | `pending_extraction` | `false` | No efficiency should be invented. |
| `systemType` | DHW final energy/loss selection | MC001-2022 DHW system categories or explicit input | category id | `pending_extraction` | `false` | Needed to select distribution/storage/generation model. |

## Further DHW distribution/auxiliary formulas to extract

Relations (3.201)-(3.224) are tracked below. Distribution losses, recoverable distribution heat, and auxiliary distribution energy are extracted:

| Relation | Status | Notes |
| --- | --- | --- |
| (3.201) | `extracted` | Linear thermal transmittance for insulated pipes. |
| (3.202) | `extracted` | Linear thermal transmittance for buried pipes. |
| (3.203) | `extracted` | Linear thermal transmittance for uninsulated pipes. |
| (3.204) | `extracted` | Approximate linear thermal transmittance for uninsulated pipes. |
| (3.205) | `extracted` | Distribution loss with recirculation. |
| (3.206) | `extracted` | Stub loss without recirculation. |
| (3.207) | `extracted` | Recirculation loss without draw-off; source formula sign preserved exactly. |
| (3.208) | `extracted` | Supporting specific linear heat loss for `thetaW,avg`. |
| (3.209) | `extracted` | Supporting exponential coefficient for non-use temperature calculation. |
| (3.210) | `extracted` | Supporting DHW temperature after non-use interval; first temperature symbol needs semantic confirmation before coding. |
| (3.211) | `extracted` | Average DHW temperature when consumption profile is known. |
| (3.212) | `extracted` | Simplified average DHW temperature for hourly timestep. |
| (3.213) | `extracted` | Total DHW distribution loss. |
| (3.214) | `extracted` | Recoverable distribution loss in conditioned spaces. |
| (3.215) | `extracted` | Distribution loss recovery factor. |
| (3.216) | `extracted` | Recovered distribution heat. |
| (3.217) | `extracted` | DHW recirculation pump design power. |
| (3.218) | `extracted` | DHW pressure drop for closed distribution circuit. |
| (3.219) | `extracted` | DHW recirculation pump electrical energy. |
| (3.220) | `extracted` | DHW auxiliary distribution energy. |
| (3.221) | `extracted` | DHW pump energy use factor. |
| (3.222) | `extracted` | DHW pump efficiency factor. |
| (3.223) | `extracted` | DHW reference pump power. |
| (3.224) | `extracted` | DHW heat tracing auxiliary energy. |

## Implementation implications for LaCurent

- DHW useful demand can be calculated independently from monthly climate dataset.
- Residential DHW default calculation can use relations (3.189), (3.192)-(3.196), and temperature defaults.
- Non-residential DHW default calculation requires Tabel 3.3.1 lookup.
- Final DHW system energy remains incomplete until storage and generation formulas are extracted.
- Do not infer DHW only from `usefulAreaM2` except where MC001 residential equivalent-consumer method explicitly uses `Ah`.
- Useful DHW energy and final DHW energy are different and must remain separate.
- No system efficiency should be invented.
- Distribution, storage, generation, and auxiliary terms must not be collapsed unless MC001 or an approved simplified non-official mode allows it.
- This module feeds final energy / primary energy modules later.

## Do not implement yet

- No calculators created.
- No production flow changed.
- No UI changed.
- No tests added.
- Next extraction module is `13_final_primary_co2_rer` or `10_lighting`, depending on priority.
