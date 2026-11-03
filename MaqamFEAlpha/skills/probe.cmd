@echo off
setlocal
set B=https://server2.vais.co.in/maqam/api/v1

echo [stocks]
for %%E in (
  "/crm/stocks/overview"
  "/crm/stocks/flights"
  "/crm/stocks/flights/000"
  "/crm/stocks/hotels"
  "/crm/stocks/hotels/000"
) do curl -s -o NUL -w "%%E -> %%{http_code}\n" --max-time 15 "%B%%%E"

echo [hotel-stock + hotels]
for %%E in (
  "/crm/hotel-stock/pending"
  "/crm/hotel-stock/000/review"
  "/crm/hotel-stock/approved"
  "/crm/hotels"
  "/crm/hotels/000"
) do curl -s -o NUL -w "%%E -> %%{http_code}\n" --max-time 15 "%B%%%E"

echo [offers crm]
for %%E in (
  "/crm/offers"
  "/crm/offers/000"
  "/crm/offers/000/toggle-status"
  "/crm/offers/book-for-customer"
  "/crm/offers/bookings"
  "/crm/offers/bookings/000/cancel"
) do curl -s -o NUL -w "%%E -> %%{http_code}\n" --max-time 15 "%B%%%E"

echo [offers public]
for %%E in (
  "/offers"
  "/offers/000"
  "/offers/000/book"
  "/offers/bookings/000"
  "/offers/bookings/000/cancel"
) do curl -s -o NUL -w "%%E -> %%{http_code}\n" --max-time 15 "%B%%%E"

echo [packages crm]
for %%E in (
  "/crm/packages"
  "/crm/packages/000"
  "/crm/packages/000/deactivate"
  "/crm/packages/000/activate"
  "/crm/packages/book-for-customer"
  "/crm/packages/bookings"
  "/crm/packages/bookings/000"
  "/crm/packages/bookings/000/assign"
  "/crm/packages/bookings/000/remark"
  "/crm/packages/bookings/000/cancel"
) do curl -s -o NUL -w "%%E -> %%{http_code}\n" --max-time 15 "%B%%%E"

echo [packages public]
for %%E in (
  "/packages"
  "/packages/000"
  "/packages/000/quote"
  "/packages/book"
  "/packages/bookings/000"
  "/packages/bookings/000/cancel"
) do curl -s -o NUL -w "%%E -> %%{http_code}\n" --max-time 15 "%B%%%E"

echo [leads]
for %%E in (
  "/crm/leads"
  "/crm/leads/000/convert"
) do curl -s -o NUL -w "%%E -> %%{http_code}\n" --max-time 15 "%B%%%E"

echo [visa]
for %%E in (
  "/visa/types"
  "/visa/apply"
  "/visa/my-applications"
  "/visa/admin/applications"
  "/visa/admin/applications/000/status"
  "/visa/admin/applications/000/assign"
) do curl -s -o NUL -w "%%E -> %%{http_code}\n" --max-time 15 "%B%%%E"
