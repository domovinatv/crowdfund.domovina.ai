# 12 — Postavke: Profile settings (i brisanje računa)

- **URL:** `/settings/profile` · **Grupa:** 6. Prekidači se spremaju odmah (bez gumba „Save”); nijedan nije diran.

## „Show in my public profile” (`default[...]`)

| polje | tip | zadano (ovaj račun) |
|---|---|---|
| E-mail (`email`) | checkbox | off |
| Profile photo (`avatar`) | checkbox | on |
| Phone number (`phone`) | checkbox | off |
| Total raised (`amountGathered`) | checkbox | off |
| Date registered (`dateRegistered`) | checkbox | on |
| Promoted fundraisers (`chipins`) | checkbox | on |
| Owned fundraisers (`chipinsPrivate`) | checkbox | on |
| Donated fundraisers (`chipinsParticipated`) | checkbox | on |
| Fundraisers on behalf of the organisation (`chipinsUnderPatronage`) | checkbox | on |
| Completed tutorials → Fundraiser edit (`tutorials[0][tutorialType]`) | checkbox | off |

## Ostalo

| polje | tip | napomena |
|---|---|---|
| Profile visible in search engines (`indexable`) | checkbox | „Your profile will remain invisible on search engines until you verify your account.” |
| Newsletter (`newsletter`) | checkbox | „occasional emails about the most interesting events and campaigns” |
| Obavijesti o donacijama, ažuriranjima, komentarima | link | „Manage notifications… see how to do it” (po kampanji, ne ovdje) |

## Delete account (samo pogled)

„When you delete your account, your fundraisers and verifications will be removed. All donations that have
been created after deleting the account will be returned to donors.” Gumb „Delete account” **nije kliknut**.

## Za nas

Postavke vidljivosti profila prenosimo 1:1 (stupci `profile_visibility`). Brisanje računa: kod nas se novac ne vraća
jer ga ne držimo. Doprinosi su već kod organizatora, a brisanje gasi kampanje.
