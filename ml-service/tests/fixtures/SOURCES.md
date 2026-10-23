# Test fixture images

All images are from **Wikimedia Commons**, downscaled to at most 800 px for the test suite. Each is used
under the licence shown on its file page (`https://commons.wikimedia.org/wiki/File:<name>`), which lists
the author and licence (public domain or Creative Commons).

| Folder | File | Used for |
|---|---|---|
| cattle | Cow_female_black_white.jpg | Holstein cow (species, breed, health, quality) |
| cattle | Water_buffalo_bathing.jpg | Water buffalo (species, breed gating) |
| cattle | Gir_cow.jpg | Gir cow; the species model alone calls it buffalo |
| cattle | Carabao.jpg | Carabao (water buffalo) |
| cattle | Holstein_cow.jpg | Holstein cow |
| cattle | Hereford_bull.jpg | Hereford bull |
| not_cattle | Cat03.jpg, Felis_catus-cat_on_snow.jpg, Collage_of_Six_Cats-02.jpg | Cats |
| not_cattle | Golde33443.jpg | Dog |
| not_cattle | Hausziege_04.jpg, Domestic_goat.jpg | Goats (Domestic_goat scores 0.9995 "cow" on the species model alone) |
| not_cattle | Flock_of_sheep.jpg | Sheep |
| not_cattle | Nokota_Horses_cropped.jpg | Horses |
| not_cattle | Donkey_in_Clovelly,_North_Devon,_England.jpg | Donkey (known false accept of the gate) |
| not_cattle | 07._Camel_Profile,_near_Silverton,_NSW,_07.07.2007.jpg | Camel |
| not_cattle | Albert_Einstein_Head.jpg | Person |
| not_cattle | 2019_Toyota_Corolla_Icon_Tech_VVT-i_Hybrid_1.8.jpg | Car |
| not_cattle | Brick_wall_close-up_view.jpg | Wall |
| not_cattle | Grass.jpg | Grass (scores 0.9987 "cow" on the species model alone) |

Teeth photos are **not** included: the dentition dataset's licence forbids redistribution. Age tests that
need a real teeth photo read it from `MAWESHI_TEETH_DIR` (or the team's local dataset) and are skipped
when it isn't available.
