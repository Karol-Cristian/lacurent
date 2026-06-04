# Physics Parameter Database

Generated from:

* `src/features/energy/physics/parameters/physics-parameters.json`
* `src/features/energy/physics/parameters/physics-indices.json`
* `src/features/energy/physics/parameters/mc001-symbols.official.json`
* `src/features/energy/physics/parameters/mc001-indices.official.json`
* `src/features/energy/physics/parameters/mc001-notation.official.json`
* `src/features/energy/physics/parameters/lacurent-mc001-parameter-links.json`

Version: 0.1.0

Scope: Canonical parameter database for the LaCurent Physics Engine.

Principle:

Every physical variable used by the engine must map to a documented parameter before it is treated as a stable calculation input or output.

Source note:

MC001 symbols and indices are official methodology vocabulary stored in mc001-symbols.official.json and mc001-indices.official.json. Values marked internal_estimate are LaCurent estimates, not official normative values.

---

## Why This Exists

The LaCurent Physics Engine must not grow through scattered variables, ambiguous abbreviations or hidden assumptions.

Every stable physical input/output should map to a canonical parameter with:

* MC001 symbol, where relevant;
* internal aliases currently found in code;
* unit;
* engine layer;
* source status;
* implementation status;
* explanation.

This is the reset point before deeper MC001 methodology synthesis.

Important:

MC001 vocabulary is stored separately as official methodology vocabulary. LaCurent parameters reference MC001 symbols/indices through an explicit mapping table. Internal estimate values remain separate from official MC001 notation.

---

## Official MC001 Symbols

Source: MC001, section 1.1.7, Table 1.1 Simboluri

| ID | Simbol | Denumire MC001 | Unitate | Capitole |
| --- | --- | --- | --- | --- |
| mc001.symbol.A | A | arie | m2 | 2, 3, 4, 5, 6 |
| mc001.symbol.a_b_c | a,b,c | parametri de calcul | - | 3 |
| mc001.symbol.Apanou | Apanou | suprafata echivalenta de captare a panoului | m2 | 4 |
| mc001.symbol.asol | asol | coeficient de absorbtie solara | - | 2 |
| mc001.symbol.Atot | Atot | aria totala a captatoarelor solare utilizate in sistem | m2 | 4 |
| mc001.symbol.b_correction | b | factor de corectie pentru coeficientul de transfer termic / factor de reducere a temperaturii | - | 2, 5, 6 |
| mc001.symbol.B | B | dimensiune caracteristica a planseului, latime | m | 2 |
| mc001.symbol.b_width | b | latime, perpendicular pe directia fluxului termic | m | 2 |
| mc001.symbol.B_prime | B' | parametru geometric al placii planseului | m | 3 |
| mc001.symbol.C_thermal_capacity | C | capacitate termica | J/K | 2, 5, 6 |
| mc001.symbol.c_specific_heat | c | capacitate termica masica | J/(kgK) | 2, 3, 5, 6 |
| mc001.symbol.C_storage | C | capacitate de acumulare termica | Wh/K | 3 |
| mc001.symbol.c_volumetric_storage | c | capacitate volumica de acumulare termica | Wh/(m3K) | 3 |
| mc001.symbol.C_cost | C | cost | EUR | 4 |
| mc001.symbol.c_concentration | c | concentratie | mg/m3 | 4 |
| mc001.symbol.CG | CG | cost global | EUR | 5, 6 |
| mc001.symbol.CHR | CHR | pondere a caldurii cogenerate | - | 4 |
| mc001.symbol.CO | CO | costuri | EUR | 5, 6 |
| mc001.symbol.cp | cp | caldura specifica masica a aerului la presiune constanta | Wh/(kgK), J/(kgK) | 2, 3, 4 |
| mc001.symbol.D_depth | D | adancime, diametru | m | 2, 5, 6 |
| mc001.symbol.d_thickness | d | distanta, grosime, grosime totala echivalenta, adancime, paralel cu directia fluxului termic | m | 2, 3, 5, 6 |
| mc001.symbol.D_days | D | zi | zile/luna | 3 |
| mc001.symbol.d_diameter | d | diametru | m | 4 |
| mc001.symbol.D_f | D_f | factor de reducere | - | 5, 6 |
| mc001.symbol.Dp | Dp | diferenta de presiune | Pa | 4 |
| mc001.symbol.Dq_a | Dq_a | diferenta de temperatura | K | 4 |
| mc001.symbol.E_emissivity | E | emisivitate intre suprafete | - | 2 |
| mc001.symbol.e_cop | e | coeficient de performanta | - | 4 |
| mc001.symbol.E_energy | E | consum de energie | J, kWh | 4, 5, 6 |
| mc001.symbol.EATR | EATR | raport de transfer de aer evacuat | - | 4 |
| mc001.symbol.EER | EER | randament energetic pentru producerea frigului | % | 2, 4 |
| mc001.symbol.Einc_i | Einc,i | energie totala incidenta in luna de calcul i | kWh | 4 |
| mc001.symbol.El_i | El,i | energie obtinuta in luna de calcul i | kWh | 4 |
| mc001.symbol.Ep_ventilation_primary | Ep | utilizare a energiei primare specifica ventilarii | Wh m-3 h a-1 | 4 |
| mc001.symbol.EP | EP | indicator de performanta energetica, indicator energetic | kWh/(m2a) | 5, 6 |
| mc001.symbol.ES | ES | flux al radiatiei solare incidente, iradiatie solara | W/m2 | 2 |
| mc001.symbol.Et_Es | Et; Es | eficienta a filtrului, totala sau pe treapta | - | 4 |
| mc001.symbol.ev | ev | eficienta a ventilarii | - | 4 |
| mc001.symbol.f_temperature | f | factor de temperatura al suprafetei interioare, factor de amortizare | - | 2 |
| mc001.symbol.F_load | F | sarcina de incalzire sau de racire | W | 4 |
| mc001.symbol.f_leakage | f | scurgere specifica | m3/(s m2) | 4 |
| mc001.symbol.f_factor | f | factor, de exemplu factor de energie primara | - | 5, 6 |
| mc001.symbol.F_f_fraction | F sau f | factor, fractie | -, % | 2, 3, 4 |
| mc001.symbol.fcap | fcap | factor de corectie al intensitatii globale a radiatiei solare | - | 4 |
| mc001.symbol.fP | fP | factor de energie primara | - | 4 |
| mc001.symbol.fpv | fpv | factor de actualizare | - | 4 |
| mc001.symbol.Ft | Ft | raport de temperatura | - | 4 |
| mc001.symbol.G_humidity_flow | G | debit de umiditate | kg/s | 2 |
| mc001.symbol.g_solar | g | factor de transmisie a energiei solare totale, factor solar | - | 2 |
| mc001.symbol.G_gradient | G | gradient vertical de temperatura | K/m | 3 |
| mc001.symbol.Gw | Gw | factor de corectie pentru apa subterana | - | 3 |
| mc001.symbol.H | H | coeficient de transfer termic | W/K | 2, 3, 5, 6 |
| mc001.symbol.h_latent | h | caldura latenta | kJ/kg | 2, 3 |
| mc001.symbol.h_surface | h | coeficient de transfer termic superficial | W/(m2K) | 2, 5, 6 |
| mc001.symbol.h_efficiency | h | eficienta | % | 4 |
| mc001.symbol.H_height | H,h | inaltime | m | 2, 3, 4 |
| mc001.symbol.Hsol | Hsol | radiatie solara cumulata lunara | kWh/m2 | 2 |
| mc001.symbol.K_CO2 | K | coeficient de emisii de CO2 | kg/kWh | 5, 6 |
| mc001.symbol.L_coupling | L | coeficient de cuplaj termic | W/(mK) | 2 |
| mc001.symbol.l_thermal_bridge | l | lungime a unei punti termice liniare | m | 3 |
| mc001.symbol.L_length | L,l | lungime | m | 2, 4, 5, 6 |
| mc001.symbol.L2D | L2D | coeficient de cuplaj termic in calculul bidimensional | W/(mK) | 2 |
| mc001.symbol.L3D | L3D | coeficient de cuplaj termic in calculul tridimensional | W/K | 2 |
| mc001.symbol.m_month | m | numarul lunii | - | 2 |
| mc001.symbol.m_mass | m | masa, de exemplu cantitatea de emisii de CO2 | kg | 5, 6 |
| mc001.symbol.N | N | numar de elemente | - | 2, 3, 5, 6 |
| mc001.symbol.n_air_changes | n | numar de schimburi de aer | h-1 | 2, 3, 5, 6 |
| mc001.symbol.O | O | ocupare | persoane | 5, 6 |
| mc001.symbol.P_perimeter | P | perimetru | m | 2, 3 |
| mc001.symbol.P_power | P | putere | W | 4, 5, 6 |
| mc001.symbol.p_pressure | p | presiune | Pa | 4, 5, 6 |
| mc001.symbol.PEC | PEC | performanta energetica a cladirilor | - |  |
| mc001.symbol.Q | Q | cantitate de caldura, energie | kWh | 2, 3, 4, 5, 6 |
| mc001.symbol.q_heat_flux | q | densitate de flux termic | W/m2 | 2, 5, 6 |
| mc001.symbol.q_air_permeability | q | permeabilitate specifica la aer a anvelopei cladirii | m3/(m2h) | 3 |
| mc001.symbol.qv_airflow | qv | debit volumic de aer | m3/h | 2, 3, 5, 6 |
| mc001.symbol.q_pipe_loss | q' | pierdere termica pe unitatea de lungime a conductei | W/m | 3 |
| mc001.symbol.R | R | rezistenta termica | m2K/W | 2, 3, 5, 6 |
| mc001.symbol.RER | RER | contributia energiei din surse regenerabile | - | 5, 6 |
| mc001.symbol.T_temperature_K | T | temperatura termodinamica | K | 2, 3, 5, 6 |
| mc001.symbol.t_time | t | timp | s sau h | 2, 5, 6 |
| mc001.symbol.U | U | transmitanta termica | W/(m2K) | 2, 3, 5, 6 |
| mc001.symbol.U_pipe | U | transmitanta termica liniara a conductelor | W/mK | 3 |
| mc001.symbol.V | V | volum | m3 | 2, 3, 4, 5, 6 |
| mc001.symbol.w_aux | w | energie auxiliara | kWh | 4 |
| mc001.symbol.X_fraction | X | fractie din volum | % | 5, 6 |
| mc001.symbol.alpha | alpha | factor de absorbtie / coeficient de transfer termic / factor de repartizare | -, W/(m2K) | 2, 3, 4 |
| mc001.symbol.beta | beta | unghi de inclinare / sarcina partiala / factor de sarcina | grade, - | 2, 3 |
| mc001.symbol.gamma | gamma | unghi de azimut / raport de bilant termic | grade, - | 2 |
| mc001.symbol.delta | delta | declinatie / adancime de penetrare periodica / diferenta | grade, m, diverse | 2, 3, 5, 6 |
| mc001.symbol.epsilon | epsilon | emisivitate / factor de consum energetic / randament / eficienta recuperarii de caldura | - | 2, 3, 4 |
| mc001.symbol.eta | eta | randament, factor de utilizare | - | 2, 3, 5, 6 |
| mc001.symbol.theta | theta | temperatura | C | 2, 3, 5, 6 |
| mc001.symbol.kappa | kappa | capacitate termica a suprafetei | J/(m2K) | 2 |
| mc001.symbol.lambda | lambda | conductivitate termica | W/(mK) | 2, 3 |
| mc001.symbol.rho | rho | densitate, masa volumica | kg/m3, kg/l | 2, 3, 5, 6 |
| mc001.symbol.tau | tau | constanta de timp | s, h | 2, 3, 5, 6 |
| mc001.symbol.phi | phi | umiditate relativa / latitudine / diferenta de faza | %, grade, rad | 2, 5, 6 |
| mc001.symbol.Phi | Phi | flux termic, sarcina termica, putere termica | W | 2, 3, 5, 6 |
| mc001.symbol.psi | psi | transmitanta termica liniara a puntii termice | W/mK | 2 |
| mc001.symbol.chi | chi | transmitanta termica punctuala a puntii termice | W | 2 |

---

## Official MC001 Indices / Subscripts

Source: MC001, section 1.1.7, Table 1.2 Indici

| ID | Indice | Termen MC001 | Capitole |
| --- | --- | --- | --- |
| mc001.index.a_air | a | aer | 2, 3, 4, 5, 6 |
| mc001.index.a_adjacent | a | adiacent | 2 |
| mc001.index.a_absorbed | a | absorbit | 2 |
| mc001.index.an | an | anual | 2, 5, 6 |
| mc001.index.ann | ann | anual | 3 |
| mc001.index.aux | aux | auxiliar | 5, 6 |
| mc001.index.avg | avg | medie temporala | 5, 6 |
| mc001.index.b_basement | b | subsol, sub nivelul solului; latime | 2 |
| mc001.index.B_building | B | cladire | 5, 6 |
| mc001.index.BAC | BAC | reglare si automatizare cladiri | 5, 6 |
| mc001.index.bg | bg | subsol, inclusiv efectul solului | 2 |
| mc001.index.C_cooling | C | racire | 2, 5, 6 |
| mc001.index.c_convection | c | convectie, convectiv, conductiv | 2 |
| mc001.index.c_cold_water | c | referitor la apa rece | 3 |
| mc001.index.calc | calc | calcul | 2, 5, 6 |
| mc001.index.CO2 | CO2 | emisii de CO2 | 5, 6 |
| mc001.index.cond | cond | condensare, condensator | 3 |
| mc001.index.corr | corr | corectat/corectie | 3 |
| mc001.index.ctr | ctr | reglare | 5, 6 |
| mc001.index.Ctrl | Ctrl | reglare | 4 |
| mc001.index.cu | cu | de la o zona climatizata la o zona neclimatizata | 2 |
| mc001.index.d_day | d, day | pe zi, zilnic | 3 |
| mc001.index.day | day | zilnic | 2, 5, 6 |
| mc001.index.del | del | furnizat | 5, 6 |
| mc001.index.design | design | conditie de calcul sau proprietati tehnice de proiectare | 3 |
| mc001.index.dh | dh | incalzire centralizata | 5, 6 |
| mc001.index.DHU | DHU | dezumidificare | 2, 5, 6 |
| mc001.index.dif | dif | difuz | 2, 4 |
| mc001.index.dir | dir | direct / directie / orientare | 2, 3 |
| mc001.index.dis | dis | distributie | 3, 5, 6 |
| mc001.index.e_external | e | extern, exterior, mediul exterior | 2, 3, 5, 6 |
| mc001.index.E_pv_wind | E | fotovoltaic, vant | 5, 6 |
| mc001.index.e_m | e,m | exterior mediu anual | 3 |
| mc001.index.eff | eff | efectiv | 2, 3 |
| mc001.index.el_element | el | element | 2 |
| mc001.index.el_electric | el | electric / electricitate | 4, 5, 6 |
| mc001.index.em | em | emisie / emitator | 5, 6 |
| mc001.index.env | env | anvelopa | 3, 5, 6 |
| mc001.index.EPus | EPus | servicii PEC incluse in evaluarea performantei energetice | 5, 6 |
| mc001.index.est | est | estimat | 5, 6 |
| mc001.index.exp | exp | exportat | 5, 6 |
| mc001.index.f_floor_frame | f | planseu, rama, cadru al unei ferestre | 2, 5, 6 |
| mc001.index.fac | fac | fatada; perete exterior vertical | 3 |
| mc001.index.fg | fg | placa pe sol a parterului, inclusiv efectul solului | 2 |
| mc001.index.Fin | Fin | final, rezidual | 5, 6 |
| mc001.index.fl_floor | fl, floor | pardoseala | 2, 3 |
| mc001.index.fr | fr | cadru | 2 |
| mc001.index.g_ground | g | sol | 2, 3 |
| mc001.index.g_gas | g | gaz | 2, 5, 6 |
| mc001.index.gn_gain | gn, gain | aporturi de caldura | 2, 3, 5, 6 |
| mc001.index.g_glazing | g, gl | vitraj, element vitrat | 2 |
| mc001.index.grid | grid | de la reteaua publica | 5, 6 |
| mc001.index.H_heating | H | incalzire | 2, 5, 6 |
| mc001.index.h_hourly | h | orar | 2, 3, 5, 6 |
| mc001.index.HC | HC | incalzire si racire | 5, 6 |
| mc001.index.HCW | HCW | incalzire, racire si preparare apa calda | 5, 6 |
| mc001.index.hr | hr | recuperare de caldura | 4 |
| mc001.index.ht | ht | transfer termic | 2, 5, 6 |
| mc001.index.HVAC | HVAC | incalzire, ventilare, climatizare | 2 |
| mc001.index.HW | HW | incalzire si preparare apa calda | 5, 6 |
| mc001.index.i_internal | i | interior, mediul interior | 2 |
| mc001.index.i_generic | i | indice general de numerotare | 3 |
| mc001.index.i_j_heated_spaces | i,j | indici de numerotare pentru spatii incalzite | 3 |
| mc001.index.IDA | IDA | aer interior | 4 |
| mc001.index.ie | ie | de la interior la exterior | 2, 3 |
| mc001.index.inf | inf | infiltratie | 3 |
| mc001.index.ins | ins | izolatie | 2 |
| mc001.index.int | int | intern sau interior | 2, 3, 5, 6 |
| mc001.index.iu | iu | intre spatiu climatizat/interior si spatiu neclimatizat/neincalzit | 2 |
| mc001.index.k_element | k | indice de numerotare pentru elemente ale cladirii | 3 |
| mc001.index.L_lighting | L | iluminat | 2, 5, 6 |
| mc001.index.l_thermal_bridge | l | indice de numerotare pentru punti termice liniare | 3 |
| mc001.index.lat | lat | latent | 5, 6 |
| mc001.index.ls | ls | pierdere | 2, 5, 6 |
| mc001.index.m_monthly | m | numar al lunii, lunar | 2, 5, 6 |
| mc001.index.m_n_zones | m,n | indice pentru zonele termice | 2 |
| mc001.index.max | max | maxim, limita superioara | 3, 5, 6 |
| mc001.index.meas | meas | masurat | 5, 6 |
| mc001.index.mech | mech | mecanic, sistem de ventilare | 3 |
| mc001.index.min | min | minim, limita inferioara | 2 |
| mc001.index.n_nominal | N,n | nominal | 3, 4 |
| mc001.index.nc | nc | neconditionat | 4 |
| mc001.index.nd | nd | necesar | 2, 5, 6 |
| mc001.index.nEPus | nEPus | servicii care nu apartin de PEC | 5, 6 |
| mc001.index.nren | nren | neregenerabil | 5, 6 |
| mc001.index.ntdel | ntdel | net furnizat | 5, 6 |
| mc001.index.oc_occ | oc, occ | ocupanti / perioada de ocupare | 2 |
| mc001.index.ODA | ODA | aer exterior | 4 |
| mc001.index.op | op | opac / operativ | 2 |
| mc001.index.out | out | productie, iesire | 5, 6 |
| mc001.index.P_primary | P | energie primara | 5, 6 |
| mc001.index.p_pressure_constant | p | presiune constanta | 2, 3 |
| mc001.index.Pnren | Pnren | energie primara din surse neregenerabile | 5, 6 |
| mc001.index.Ptot | Ptot | energie primara totala | 5, 6 |
| mc001.index.pv | pv | energie solara fotovoltaica | 5, 6 |
| mc001.index.r_radiant | r | radiatie, radiant | 2 |
| mc001.index.rbl | rbl | recuperabil | 5, 6 |
| mc001.index.rec | rec | recuperare de caldura | 3 |
| mc001.index.ref | ref | referinta | 3, 4 |
| mc001.index.ren | ren | energie din surse regenerabile | 5, 6 |
| mc001.index.s_surface_space | s | spatiu / suprafata | 2 |
| mc001.index.se | se | suprafata exterioara | 2 |
| mc001.index.seas | seas | sezonier | 5, 6 |
| mc001.index.si | si | suprafata interioara | 2 |
| mc001.index.sol | sol | solar | 2, 5, 6 |
| mc001.index.spec | spec | specifica | 2 |
| mc001.index.sto | sto | acumulare / stocare | 3, 5, 6 |
| mc001.index.sup | sup | alimentare, furnizare | 2, 3 |
| mc001.index.sys | sys | sistem | 2 |
| mc001.index.t_time | t | timp / pas de timp | 2, 3 |
| mc001.index.T_thermal | T | termic | 2, 5, 6 |
| mc001.index.TB_tb | TB,tb | punte termica | 2, 3 |
| mc001.index.tot | tot | total | 2, 5, 6 |
| mc001.index.tr | tr | transmisie, transfer termic | 2, 3, 5, 6 |
| mc001.index.u | u | neconditionat / neclimatizat | 2 |
| mc001.index.U | U | calitate sau conditie relativa la transmitanta termica, valoare U | 3 |
| mc001.index.ue | ue | intre spatiu neclimatizat/neincalzit si exterior | 2, 3 |
| mc001.index.use | use | util / aria utila | 2, 5, 6 |
| mc001.index.v_ventilated | v | ventilat / volum sau debit volumic | 2, 3 |
| mc001.index.V_ventilation | V | ventilare | 3, 5, 6 |
| mc001.index.ve | ve | ventilare | 2, 3, 5, 6 |
| mc001.index.w_wall | w | perete | 2 |
| mc001.index.W_dhw | W | apa calda de consum / apa | 2, 3, 5, 6 |
| mc001.index.DHW | DHW | preparare a apei calde de consum | 5, 6 |
| mc001.index.W_window | W,w | fereastra | 2 |
| mc001.index.wd | wd | lemn | 5, 6 |
| mc001.index.X | X | oricare utilitate a cladirii considerate | 5, 6 |
| mc001.index.XY | XY | combinatie de H, C, W | 5, 6 |
| mc001.index.Y | Y | orice subsistem | 5, 6 |
| mc001.index.z | z | indice de numerotare pentru zone ale cladirii | 3 |
| mc001.index.zt | zt | zona termica | 2, 4, 5, 6 |
| mc001.index.ztc | ztc | zona climatizata | 2 |
| mc001.index.ztu | ztu | zona neclimatizata | 2 |
| mc001.index.zv | zv | zona ventilata | 2 |

---

## LaCurent To MC001 Mapping

| LaCurent parameter | MC001 notation | LaTeX | MC001 indices | Relationship |
| --- | --- | --- | --- | --- |
| area | A | A |  | direct_symbol |
| useful_floor_area | A_use | A_{use} | use | symbol_with_index |
| volume | V | V |  | direct_symbol |
| area_volume_ratio | A/V | \frac{A}{V} |  | derived_ratio |
| thickness | d | d |  | direct_symbol |
| thermal_conductivity | λ | \lambda |  | direct_symbol |
| layer_thermal_resistance | R | R |  | direct_symbol |
| internal_surface_resistance | R_si | R_{si} | si | symbol_with_index |
| external_surface_resistance | R_se | R_{se} | se | symbol_with_index |
| total_thermal_resistance | R_tot | R_{tot} | tot | symbol_with_index |
| thermal_transmittance | U | U |  | direct_symbol |
| corrected_thermal_transmittance | U_corr / U′ | U_{corr}\; /\; U' | corr | symbol_with_index |
| linear_thermal_bridge_transmittance | ψ | \psi | TB,tb | symbol_with_index |
| thermal_bridge_length | l | l | l | direct_symbol |
| thermal_bridge_heat_transfer | H_tb | H_{tb} | TB,tb | symbol_with_index |
| heat_transfer_coefficient | H | H | ht | symbol_with_index |
| transmission_heat_transfer | H_tr | H_{tr} | tr | symbol_with_index |
| air_change_rate | n | n |  | direct_symbol |
| airflow | q_v | q_v |  | direct_symbol |
| heat_recovery_efficiency | ε_hr | \varepsilon_{hr} | hr | symbol_with_index |
| ventilation_heat_transfer | H_ve | H_{ve} | ve | symbol_with_index |
| heating_degree_days | D_H / HDD | D_H\; /\; HDD | H | methodology_mapping |
| heating_demand | Q_H,nd | Q_{H,nd} | H, nd | symbol_with_indices |
| cooling_demand | Q_C,nd | Q_{C,nd} | C, nd | symbol_with_indices |
| domestic_hot_water_demand | Q_W,nd | Q_{W,nd} | W, nd | symbol_with_indices |
| solar_radiation | H_sol | H_{sol} | sol | direct_symbol |
| solar_total_energy_transmittance | g | g | g, gl | direct_symbol |
| internal_gains | Q_gn,int | Q_{gn,int} | gn, gain, int | symbol_with_indices |
| gain_utilization_factor | η_gn | \eta_{gn} | gn, gain | symbol_with_index |
| system_efficiency | η_sys | \eta_{sys} | sys | symbol_with_index |
| scop | SCOP | SCOP |  | methodology_mapping |
| seer | EER / SEER | EER\; /\; SEER |  | methodology_mapping |
| final_energy | E_fin | E_{fin} | Fin | symbol_with_index |
| final_energy_specific | E_fin,sp | E_{fin,sp} | Fin, spec | symbol_with_indices_pending_index_seed |
| primary_energy_factor | f_P | f_P | P | direct_symbol |
| primary_energy | E_P | E_P | P | symbol_with_index |
| primary_energy_specific | EP | EP | P | direct_symbol |
| co2_emission_factor | K_CO2 | K_{CO_2} | CO2 | direct_symbol |
| co2_emissions | m_CO2 | m_{CO_2} | CO2 | symbol_with_index |
| co2_emissions_specific | m_CO2,sp | m_{CO_2,sp} | CO2, spec | symbol_with_indices_pending_index_seed |

---

## Parameters By Layer

### all

| ID | MC001 | LaTeX | Denumire | Unitate | Layer | Status | Sursa | Explicatie |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| calculation_confidence | - | - | Incredere calcul | - | all | implemented_partial | lacurent_metadata | Nivel LaCurent care marcheaza cat de sigura este o valoare in functie de sursa si date lipsa. |
| calculation_source | - | - | Sursa valorii | - | all | implemented_partial | lacurent_metadata | Indica daca valoarea vine din input, registru, estimare interna, sursa normativa sau rezultat calculat. |

### classification

| ID | MC001 | LaTeX | Denumire | Unitate | Layer | Status | Sursa | Explicatie |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| primary_energy_specific | EP | EP | Indicator specific de energie primara | kWh/m2/an | classification | implemented_partial | mc001_symbol | Indicator energetic specific folosit pentru clasificari si comparatii. |

### climate

| ID | MC001 | LaTeX | Denumire | Unitate | Layer | Status | Sursa | Explicatie |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| heating_degree_days | D_H / HDD | D_H\; /\; HDD | Grade-zile de incalzire | K day | climate | implemented_partial | internal_estimate | Indicator climatic simplificat pentru severitatea sezonului de incalzire. |

### co2

| ID | MC001 | LaTeX | Denumire | Unitate | Layer | Status | Sursa | Explicatie |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| co2_emission_factor | K_CO2 | K_{CO_2} | Coeficient emisii CO2 | kgCO2/kWh | co2 | implemented_partial | internal_estimate | Coeficient de conversie din energie finala in emisii CO2. |
| co2_emissions | m_CO2 | m_{CO_2} | Emisii CO2 | kgCO2/an | co2 | implemented_partial | mc001_concept_simplified | Masa de emisii CO2 asociata consumului energetic. |
| co2_emissions_specific | m_CO2,sp | m_{CO_2,sp} | Emisii CO2 specifice | kgCO2/m2/an | co2 | implemented_partial | internal_mapping_to_mc001 | Emisii CO2 raportate la aria incalzita/utila. |

### dhw

| ID | MC001 | LaTeX | Denumire | Unitate | Layer | Status | Sursa | Explicatie |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| domestic_hot_water_demand | Q_W,nd | Q_{W,nd} | Necesar util ACM | kWh/an | dhw | implemented_partial | mc001_concept_simplified | Energia utila pentru prepararea apei calde menajere. |

### energy_demand

| ID | MC001 | LaTeX | Denumire | Unitate | Layer | Status | Sursa | Explicatie |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| heating_demand | Q_H,nd | Q_{H,nd} | Necesar util de incalzire | kWh/an | energy_demand | implemented_partial | mc001_concept_simplified | Energia utila necesara spatiului pentru mentinerea temperaturii interioare. |
| cooling_demand | Q_C,nd | Q_{C,nd} | Necesar util de racire | kWh/an | energy_demand | implemented_partial | internal_estimate | Energia utila necesara pentru racirea spatiului. |
| gain_utilization_factor | η_gn | \eta_{gn} | Factor de utilizare a aporturilor | - | energy_demand | implemented_partial | internal_estimate | Fractiunea din aporturile solare/interne care reduce necesarul de incalzire. |

### envelope

| ID | MC001 | LaTeX | Denumire | Unitate | Layer | Status | Sursa | Explicatie |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| thickness | d | d | Grosime strat | m | envelope | implemented_partial | mc001_symbol | Grosimea unui strat de material pe directia fluxului termic. |
| thermal_conductivity | λ | \lambda | Conductivitate termica | W/mK | envelope | implemented_partial | mc001_symbol | Proprietate a materialului care descrie cat de usor conduce caldura. |
| layer_thermal_resistance | R | R | Rezistenta termica a stratului | m2K/W | envelope | implemented_partial | mc001_formula_concept | Rezistenta termica a unui strat omogen. |
| internal_surface_resistance | R_si | R_{si} | Rezistenta superficiala interioara | m2K/W | envelope | implemented_partial | internal_estimate | Rezistenta schimbului de caldura la suprafata interioara. |
| external_surface_resistance | R_se | R_{se} | Rezistenta superficiala exterioara | m2K/W | envelope | implemented_partial | internal_estimate | Rezistenta schimbului de caldura la suprafata exterioara. |
| total_thermal_resistance | R_tot | R_{tot} | Rezistenta termica totala | m2K/W | envelope | implemented_partial | mc001_formula_concept | Rezistenta termica totala a unui element de anvelopa. |
| thermal_transmittance | U | U | Transmitanta termica | W/m2K | envelope | implemented_partial | mc001_formula_concept | Flux termic transferat printr-un metru patrat de element la diferenta de temperatura de 1 K. |
| corrected_thermal_transmittance | U_corr / U′ | U_{corr}\; /\; U' | Transmitanta termica corectata | W/m2K | envelope | implemented_partial | mc001_formula_concept | Transmitanta ajustata cu efectul puntilor termice sau al factorilor de corectie. |
| heat_transfer_coefficient | H | H | Coeficient de transfer termic | W/K | envelope | implemented_partial | mc001_symbol | Coeficient care arata pierderea termica la 1 K diferenta de temperatura. |
| transmission_heat_transfer | H_tr | H_{tr} | Transfer termic prin transmisie | W/K | envelope | implemented_partial | mc001_formula_concept | Suma transferurilor termice prin elementele de anvelopa si corectiile relevante. |

### final_energy

| ID | MC001 | LaTeX | Denumire | Unitate | Layer | Status | Sursa | Explicatie |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| final_energy | E_fin | E_{fin} | Energie finala | kWh/an | final_energy | implemented_partial | mc001_concept_simplified | Energia consumata efectiv de sistemele tehnice ale cladirii. |
| final_energy_specific | E_fin,sp | E_{fin,sp} | Energie finala specifica | kWh/m2/an | final_energy | implemented_partial | internal_mapping_to_mc001 | Energia finala raportata la aria incalzita/utila. |

### gains

| ID | MC001 | LaTeX | Denumire | Unitate | Layer | Status | Sursa | Explicatie |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| solar_radiation | H_sol | H_{sol} | Radiatie solara cumulata | kWh/m2 | gains | implemented_partial | internal_estimate | Radiatia solara disponibila pe orientari sau pe plan orizontal. |
| solar_total_energy_transmittance | g | g | Factor solar al vitrajului | - | gains | implemented_partial | internal_estimate | Fractiunea energiei solare transmise prin vitraj. |
| internal_gains | Q_gn,int | Q_{gn,int} | Aporturi interne | kWh | gains | implemented_partial | internal_estimate | Aporturi de caldura de la persoane, iluminat si aparate. |

### geometry

| ID | MC001 | LaTeX | Denumire | Unitate | Layer | Status | Sursa | Explicatie |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| area | A | A | Arie | m2 | geometry | implemented_partial | mc001_symbol | Suprafata unui element, a unei zone sau a unei parti din cladire. |
| useful_floor_area | A_use | A_{use} | Arie utila / arie incalzita | m2 | geometry | implemented_partial | internal_mapping_to_mc001 | Aria de referinta folosita pentru indicatori specifici pe metru patrat. |
| volume | V | V | Volum | m3 | geometry | implemented_partial | mc001_symbol | Volumul zonei incalzite sau al unei zone termice. |
| area_volume_ratio | A/V | \frac{A}{V} | Raport arie / volum | 1/m | geometry | planned | internal_mapping_to_mc001 | Indicator de compactitate al cladirii. |

### primary_energy

| ID | MC001 | LaTeX | Denumire | Unitate | Layer | Status | Sursa | Explicatie |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| primary_energy_factor | f_P | f_P | Factor de energie primara | - | primary_energy | implemented_partial | internal_estimate | Factor de conversie din energie finala in energie primara. |
| primary_energy | E_P | E_P | Energie primara | kWh/an | primary_energy | implemented_partial | mc001_concept_simplified | Energia primara asociata energiei finale consumate. |

### systems

| ID | MC001 | LaTeX | Denumire | Unitate | Layer | Status | Sursa | Explicatie |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| system_efficiency | η_sys | \eta_{sys} | Randament sistem | - | systems | implemented_partial | internal_estimate | Raport intre energia utila livrata si energia finala consumata. |
| scop | SCOP | SCOP | Coeficient sezonier de performanta | - | systems | implemented_partial | internal_estimate | Raport sezonier intre caldura livrata de pompa de caldura si energia electrica folosita. |
| seer | EER / SEER | EER\; /\; SEER | Eficienta sezoniera de racire | - | systems | implemented_partial | internal_estimate | Raport intre frigul livrat si energia electrica folosita. |

### thermal_bridges

| ID | MC001 | LaTeX | Denumire | Unitate | Layer | Status | Sursa | Explicatie |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| linear_thermal_bridge_transmittance | ψ | \psi | Transmitanta termica liniara a puntii termice | W/mK | thermal_bridges | implemented_partial | internal_estimate | Pierdere termica pe unitatea de lungime pentru o punte termica liniara. |
| thermal_bridge_length | l | l | Lungime punte termica | m | thermal_bridges | implemented_partial | mc001_symbol | Lungimea puntii termice liniare. |
| thermal_bridge_heat_transfer | H_tb | H_{tb} | Coeficient transfer termic prin punti termice | W/K | thermal_bridges | implemented_partial | mc001_formula_concept | Contributia puntilor termice la coeficientul total de transfer termic. |

### ventilation

| ID | MC001 | LaTeX | Denumire | Unitate | Layer | Status | Sursa | Explicatie |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| air_change_rate | n | n | Numar de schimburi de aer | 1/h | ventilation | implemented_partial | mc001_symbol | Numarul de volume de aer schimbate intr-o ora. |
| airflow | q_v | q_v | Debit volumic de aer | m3/h | ventilation | implemented_partial | mc001_symbol | Debit de aer prin ventilare sau infiltratii. |
| heat_recovery_efficiency | ε_hr | \varepsilon_{hr} | Eficienta recuperarii de caldura | - | ventilation | implemented_partial | mc001_symbol | Fractiunea de caldura recuperata din aerul evacuat. |
| ventilation_heat_transfer | H_ve | H_{ve} | Transfer termic prin ventilare | W/K | ventilation | implemented_partial | mc001_formula_concept | Pierderea termica asociata schimbului de aer. |

---

## MC001 Indices / Subscripts

| Indice | Termen | Sens in engine | Exemple | Regula cleanup |
| --- | --- | --- | --- | --- |
| H | incalzire | Energy service: space heating | Q_H_nd, E_H_fin | Do not use H alone in code when it may mean heat transfer coefficient. Use heating or heatTransfer explicitly. |
| C | racire | Energy service: space cooling | Q_C_nd, E_C_fin |  |
| W | apa calda de consum | Energy service: domestic hot water | Q_W_nd, E_W_fin | In code use dhw, not W, to avoid conflict with watt. |
| L | iluminat | Energy service: lighting | E_L_fin |  |
| tr | transmisie | Heat transfer through envelope elements | H_tr | Use transmissionHeatTransfer for canonical code identifiers. |
| ve | ventilare | Heat transfer caused by airflow | H_ve | Use ventilationHeatTransfer for canonical code identifiers. |
| tb | punte termica | Thermal bridge correction | H_tb, psi_tb |  |
| nd | necesar | Useful demand before systems | Q_H_nd, Q_C_nd, Q_W_nd | Never mix nd with final energy. nd belongs to Energy Demand layer. |
| fin | final | Final energy after system efficiencies/losses | E_H_fin, E_fin | Use finalEnergy only after Systems layer. |
| P | energie primara | Primary energy converted from final energy | E_P, EP |  |
| nren | neregenerabil | Non-renewable part of primary energy | E_P_nren |  |
| ren | regenerabil | Renewable part of primary energy | E_P_ren |  |
| CO2 | emisii CO2 | Carbon dioxide emissions | m_CO2 |  |
| i | interior / indice general | Use only in formulas, not as an opaque code variable |  | Avoid generic i/j/k in persistent model field names. |
| e | exterior | External environment | Rse |  |
| si | suprafata interioara | Internal surface resistance/heat transfer | Rsi |  |
| se | suprafata exterioara | External surface resistance/heat transfer | Rse |  |
| zt | zona termica | Thermal zone | ThermalZone |  |
| ztc | zona climatizata | Conditioned zone | conditioned_zone |  |
| ztu | zona neclimatizata | Unconditioned zone | UnconditionedZone, b_ztu |  |
| em | emisie | Heating emission subsystem | emissionEfficiency |  |
| dis | distributie | System distribution subsystem | distributionEfficiency |  |
| sto | stocare | System storage subsystem | storageEfficiency |  |
| gen | generare | System generation subsystem | generationEfficiency |  |
| ctr | reglare | System control subsystem | controlEfficiency |  |
| aux | auxiliar | Auxiliary energy for pumps, fans and controls | auxiliaryEnergy |  |

---

## Cleanup Rules

1. Keep MC001 symbols for formulas and documentation.
2. Use descriptive English identifiers in code.
3. Do not persist ambiguous symbols such as `H`, `Q`, `E`, `i`, `j` as model field names.
4. Separate useful demand `nd` from final energy `fin`.
5. Separate transmission `tr` from ventilation `ve`.
6. Every value exposed by the physics engine should carry value, unit, source, confidence and assumptions.
7. Values marked `internal_estimate` must not be described as official MC001 values.
8. Before adding a new formula, add or update the parameters it consumes and produces.

---

## Next Work

* Expand this database chapter by chapter while reviewing MC001.
* Replace duplicate field names in the engine with canonical identifiers.
* Add formula registry entries that reference these parameter IDs.
* Add validation cases from parameter IDs rather than hand-written ad hoc labels.
