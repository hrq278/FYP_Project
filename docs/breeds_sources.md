# Breed knowledge base: sources and method

`backend/data/breeds.json` holds the only breed facts the LLM may use in reports and answers. Collected 2026-10-23.

## Method

- **Facts** (origin, primary use, milk yield, weight, heat tolerance) are taken from the sources below. Yields differ a lot between sources, herds and management, so ranges are given as reported. Where no source gave a figure, the entry says "not found in the sources used" instead of a number.
- **Suitability** per buying purpose is *derived*, not measured:
  - **milk**: strong if the documented primary use is dairy; fair for dual purpose; weak for draught or very small breeds.
  - **breeding**: strong for well-adapted local dairy breeds (Sahiwal, Red Sindhi, Cholistani, Nili-Ravi, Kundi, Murrah); fair for exotic dairy breeds (heat stress in Pakistan) and dual-purpose breeds; weak otherwise.
  - **qurbani**: any healthy animal of at least 2 years is valid; suitability reflects body size: strong for large breeds (adult females about 450 kg or more, or described as large/heavy), fair for medium, weak for very small breeds.
  - **meat**: same body-size basis; draught and large breeds strong.
  - **farm_work**: strong for breeds documented as draught; fair for dual purpose; weak for dairy breeds.
  - **other**: fair, or weak for very small breeds.
- The rule engine scores strong / fair / weak as 40 / 25 / 10 points; breeds not in the file score 20 (unknown).

## Qurbani age rule (rule engine)

Cattle and buffalo must be at least two (lunar) years old for Qurbani, per Hanafi rulings: [IslamQA (Darul Uloom Trinidad)](https://islamqa.org/hanafi/darululoomtt/149993/age-of-animals-for-qurbani/), [IslamQA (Arij Canada)](https://islamqa.org/hanafi/arij-canada/230568/what-animals-can-be-slaughtered-in-qurbani-and-what-is-the-minimum-age-required/), [Jamiat South Africa](https://jamiat.org.za/qurbani-of-a-cow-a-few-days-short-of-two-years/). The sources found don't set a separate permanent-teeth rule for cattle, so the app uses teeth only as evidence of age and asks the buyer to confirm in person.

## Sources

1. Oklahoma State University, Breeds of Livestock: Sahiwal. https://breeds.okstate.edu/cattle/sahiwal-cattle
2. Cambridge Core review of Sahiwal performance (adult weights ~350 kg female / ~500 kg male; weighted average ~1,900 kg). https://www.cambridge.org/core/product/4BE68CD024E1B0FB3F56FD6AF7D1452B
3. ICAR Journal of Livestock Biodiversity, genetic evaluation of lactation milk yields in Sahiwal cattle. https://epubs.icar.org.in/index.php/JLB/article/view/157719
4. Breeds of dairy cattle (Red Sindhi yields, weight, heat and tick tolerance). https://vetinfo.yolasite.com/breeds-of-dairy-cattle.php
5. Vikaspedia, Breeds of cattle and buffalo. https://en.vikaspedia.in/viewcontent/agriculture/livestock/cattle-buffalo/breeds-of-cattle-buffalo
6. RAJUVAS Livestock Research Station, breed-wise performance (lactation yields: Rathi 2,612, Tharparkar 2,194, Sahiwal 1,925, Kankrej 1,805, Gir 1,749 litres). https://rajuvas.org/livestock-research-station-2
7. Wikipedia, Kankrej (weights, dual purpose, gait). https://en.wikipedia.org/wiki/Kankrej
8. Krishikosh / Kerala Agricultural University, Vechur body weight and milk; "Umblachery Cattle – A Wet Plougher". https://krishikosh.egranth.ac.in/items/4b547f9c-aec1-497a-8c07-2092bff7e89d
9. Guinness World Records, Smallest breed of cattle (Vechur). https://www.guinnessworldrecords.com/world-records/70839-smallest-breed-of-cattle
10. University of Kentucky, Dairy Cattle Discovery: Breeds (US herd averages; weights converted from lb). https://afs.mgcafe.uky.edu/extension/4-h-youth/dairy/discovery/breeds
11. Pakistan Veterinary Journal 28(1), Holstein Friesian and Jersey in Punjab. https://www.pvj.com.pk/abstract/28_1/3.htm
12. SKUAST, HF crossbred cattle (heat tolerance of HF vs Jersey crosses). https://skuast.org/WMSDP/cattle-hf-cross.html
13. Journal of Dairy Science (2023), Brown Swiss vs Holstein under heat stress. https://doaj.org/article/01f650f8c5054bf2a4949a9815a85af4
14. UVAS Dairy Club, Breed improvement plans (Cholistani 1,400-2,000 kg, peak ~26 kg/day). https://www.uvas.edu.pk/doc/society-club/dairy-club/seminars/roadmap/session-2/breed-improvement-plants.pdf
15. Wikipedia, Cholistani cattle (origin; 1,200-1,800 litres, citing Pak Dairy Info). https://en.wikipedia.org/wiki/Cholistani_cattle
16. Tropentag 2010 abstract on Pakistani cattle breeds (Dhanni, Lohani, Achai). https://www.tropentag.de/2010/abstracts/full/949.pdf
17. Wikipedia, Lohani cattle. https://en.wikipedia.org/wiki/Lohani_cattle
18. Wikipedia, Dajal cattle. https://en.wikipedia.org/wiki/Dajal_cattle
19. Pakistan Bureau of Statistics, livestock census Table 7.10 (breed populations). https://www.pbs.gov.pk/wp-content/uploads/2020/07/Table-7.10.pdf
20. CIRB Buffalopedia, Nili-Ravi. https://buffalopedianew.cirb.res.in/niliravi/
21. Wikipedia, Nili-Ravi. https://en.wikipedia.org/wiki/Nili-Ravi
22. University of Sindh Research Journal, Kundhi buffalo milk yield (Rohri herd, 1976-2004). https://sujo.usindh.edu.pk/index.php/SURJ/article/download/4464/4298
23. TNAU Agritech, Breeds of buffaloes (Murrah, Jaffarabadi); SKUAST Jaffarabadi page. https://agritech.tnau.ac.in/animal_husbandry/animhus_buffalo%20breeds.html , https://skuast.org/wmodf/jaffarabadi-buffalow.html

Several pages (Oklahoma State, TNAU, NDDB) could not be opened directly from the development network; their figures were taken from search-result excerpts of those pages and should be re-checked against the full page before the thesis is submitted.
