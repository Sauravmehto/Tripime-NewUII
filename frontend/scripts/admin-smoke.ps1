# Admin API smoke tests (Phase 6)
# Run with backend on :8002:  powershell -File scripts/admin-smoke.ps1

$ErrorActionPreference = "Stop"
$base = if ($env:API_BASE) { $env:API_BASE } else { "http://127.0.0.1:8002" }

Write-Host "Using API $base"

$login = Invoke-RestMethod -Method Post -Uri "$base/api/admin/login" -ContentType "application/json" -Body '{"username":"admin","password":"admin123"}'
$token = $login.token
$headers = @{ Authorization = "Bearer $token" }

# --- Test 1: Package create → list → update → delete ---
$createBody = @{
  title = "Smoke Test Package"
  tagline = "Automated"
  destination = "Goa"
  category = "domestic"
  catalog = "itinerary"
  themeId = $null
  duration = "2N / 3D"
  stays = "Hotel"
  guests = "2 Adults"
  highlights = @("Beach")
  itinerary = @("Day 1")
  price = 9999
  priceNote = "per person"
  negotiable = $true
  imageUrl = "https://images.pexels.com/photos/457882/pexels-photo-457882.jpeg?auto=compress&cs=tinysrgb&w=800"
  pdfUrl = ""
  eventDate = $null
  featured = $false
  sortOrder = 100
  active = $true
} | ConvertTo-Json -Depth 5

$created = Invoke-RestMethod -Method Post -Uri "$base/api/admin/packages" -Headers $headers -ContentType "application/json" -Body $createBody
$list = Invoke-RestMethod -Method Get -Uri "$base/api/admin/packages" -Headers $headers
if (-not ($list | Where-Object { $_.id -eq $created.id })) { throw "Test1 FAIL: not listed" }

$upd = $createBody | ConvertFrom-Json
$upd.title = "Smoke Test Package Updated"
$upd.active = $false
$updated = Invoke-RestMethod -Method Put -Uri "$base/api/admin/packages/$($created.id)" -Headers $headers -ContentType "application/json" -Body ($upd | ConvertTo-Json -Depth 5)
if ($updated.title -ne "Smoke Test Package Updated") { throw "Test1 FAIL: update" }

Invoke-RestMethod -Method Delete -Uri "$base/api/admin/packages/$($created.id)" -Headers $headers | Out-Null
$list2 = Invoke-RestMethod -Method Get -Uri "$base/api/admin/packages" -Headers $headers
if ($list2 | Where-Object { $_.id -eq $created.id }) { throw "Test1 FAIL: delete" }
Write-Host "PASS Test1 package CRUD ($($created.id))"

# --- Test 2: Public enquiry → admin status update ---
$enq = Invoke-RestMethod -Method Post -Uri "$base/api/enquiries" -ContentType "application/json" -Body (@{
  source = "package"
  name = "Smoke Tester"
  email = "smoke@test.example"
  phone = "9000000000"
  message = "Status flow"
  travelers = 2
} | ConvertTo-Json)

$enq2 = Invoke-RestMethod -Method Post -Uri "$base/api/admin/enquiries/$($enq.id)/status" -Headers $headers -ContentType "application/json" -Body '{"status":"CLOSED"}'
if ($enq2.status -ne "CLOSED") { throw "Test2 FAIL: status" }
Write-Host "PASS Test2 enquiry status ($($enq.id))"

$filtered = Invoke-RestMethod -Method Get -Uri "$base/api/admin/enquiries?source=package" -Headers $headers
if (-not ($filtered | Where-Object { $_.id -eq $enq.id })) { throw "Test2b FAIL: source filter" }
Write-Host "PASS Test2b enquiry source filter"

$enqStats = Invoke-RestMethod -Method Get -Uri "$base/api/admin/enquiries/stats" -Headers $headers
Write-Host "PASS Test2c enquiry stats total.package=$($enqStats.total.package)"

# --- Test 3: Package theme CRUD ---
$themeBody = @{ name = "Smoke Theme"; active = $true; sortOrder = 99 } | ConvertTo-Json
$theme = Invoke-RestMethod -Method Post -Uri "$base/api/admin/package-themes" -Headers $headers -ContentType "application/json" -Body $themeBody
$themeList = Invoke-RestMethod -Method Get -Uri "$base/api/admin/package-themes" -Headers $headers
if (-not ($themeList | Where-Object { $_.id -eq $theme.id })) { throw "Test3 FAIL: theme not listed" }
$themeUpd = @{ name = "Smoke Theme Updated"; active = $false; sortOrder = 99 } | ConvertTo-Json
$theme2 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/package-themes/$($theme.id)" -Headers $headers -ContentType "application/json" -Body $themeUpd
if ($theme2.name -ne "Smoke Theme Updated") { throw "Test3 FAIL: theme update" }
Invoke-RestMethod -Method Delete -Uri "$base/api/admin/package-themes/$($theme.id)" -Headers $headers | Out-Null
Write-Host "PASS Test3 package theme CRUD ($($theme.id))"

# --- Test 4: Flyshop catalog stays off public list ---
$flyBody = $createBody | ConvertFrom-Json
$flyBody.title = "Smoke Flyshop"
$flyBody.catalog = "flyshop"
$fly = Invoke-RestMethod -Method Post -Uri "$base/api/admin/packages" -Headers $headers -ContentType "application/json" -Body ($flyBody | ConvertTo-Json -Depth 5)
$publicPkgs = Invoke-RestMethod -Method Get -Uri "$base/api/packages"
if ($publicPkgs | Where-Object { $_.id -eq $fly.id }) { throw "Test4 FAIL: flyshop leaked to public" }
$adminFly = Invoke-RestMethod -Method Get -Uri "$base/api/admin/packages?catalog=flyshop" -Headers $headers
if (-not ($adminFly | Where-Object { $_.id -eq $fly.id })) { throw "Test4 FAIL: flyshop not in admin catalog" }
Invoke-RestMethod -Method Delete -Uri "$base/api/admin/packages/$($fly.id)" -Headers $headers | Out-Null
Write-Host "PASS Test4 flyshop catalog isolation ($($fly.id))"

# --- Test 5: Agency profile GET → PUT ---
$profile = Invoke-RestMethod -Method Get -Uri "$base/api/admin/profile" -Headers $headers
if (-not $profile.companyName) { throw "Test5 FAIL: profile missing companyName" }
$profileBody = @{
  companyName = $profile.companyName
  agencyName = $profile.agencyName
  domainName = $profile.domainName
  email = $profile.email
  contactNo = $profile.contactNo
  panNumber = $profile.panNumber
  gstNumber = $profile.gstNumber
  address = $profile.address
} | ConvertTo-Json
$saved = Invoke-RestMethod -Method Put -Uri "$base/api/admin/profile" -Headers $headers -ContentType "application/json" -Body $profileBody
if ($saved.email -ne $profile.email) { throw "Test5 FAIL: profile round-trip" }
if (-not $saved.username) { throw "Test5 FAIL: username missing" }
Write-Host "PASS Test5 agency profile ($($saved.username))"

# --- Test 6: Website CMS general GET → PUT ---
$site = Invoke-RestMethod -Method Get -Uri "$base/api/admin/website" -Headers $headers
if (-not $site.general.account.firstName) { throw "Test6 FAIL: website general missing" }
$generalBody = $site.general | ConvertTo-Json -Depth 5
$site2 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/general" -Headers $headers -ContentType "application/json" -Body $generalBody
if ($site2.general.account.email -ne $site.general.account.email) { throw "Test6 FAIL: website general round-trip" }
Write-Host "PASS Test6 website general ($($site2.general.agency.agencyName))"

$site3 = Invoke-RestMethod -Method Get -Uri "$base/api/admin/website" -Headers $headers
if (-not $site3.website.defaultFlight.fromCode) { throw "Test7 FAIL: website setting missing" }
$settingBody = $site3.website | ConvertTo-Json -Depth 6
$site4 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/setting" -Headers $headers -ContentType "application/json" -Body $settingBody
if ($site4.website.defaultFlight.toCode -ne $site3.website.defaultFlight.toCode) { throw "Test7 FAIL: website setting round-trip" }
if ($site4.general.account.email -ne $site3.general.account.email) { throw "Test7 FAIL: general wiped" }
Write-Host "PASS Test7 website setting ($($site4.website.defaultFlight.fromCode)-$($site4.website.defaultFlight.toCode))"

$site5 = Invoke-RestMethod -Method Get -Uri "$base/api/admin/website" -Headers $headers
if (-not $site5.seo.home.title) { throw "Test8 FAIL: seo missing" }
$originalTitle = $site5.seo.home.title
$site5.seo.home.title = "Smoke SEO Title"
$seoBody = $site5.seo | ConvertTo-Json -Depth 8
$site6 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/seo" -Headers $headers -ContentType "application/json" -Body $seoBody
if ($site6.seo.home.title -ne "Smoke SEO Title") { throw "Test8 FAIL: seo update" }
if ($site6.website.defaultFlight.fromCode -ne $site5.website.defaultFlight.fromCode) { throw "Test8 FAIL: website wiped" }
if ($site6.general.account.email -ne $site5.general.account.email) { throw "Test8 FAIL: general wiped" }
$site5.seo.home.title = $originalTitle
$site7 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/seo" -Headers $headers -ContentType "application/json" -Body ($site5.seo | ConvertTo-Json -Depth 8)
if ($site7.seo.home.title -ne $originalTitle) { throw "Test8 FAIL: seo restore" }
Write-Host "PASS Test8 website seo ($($site7.seo.routes.flight))"

$site8 = Invoke-RestMethod -Method Get -Uri "$base/api/admin/website" -Headers $headers
if (-not $site8.seoMore.robotsTxt) { throw "Test9 FAIL: seoMore missing" }
$originalSitemap = $site8.seoMore.sitemapUrl
$site8.seoMore.sitemapUrl = "https://tripime.com/sitemap.xml"
$site9 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/seo-more" -Headers $headers -ContentType "application/json" -Body ($site8.seoMore | ConvertTo-Json -Depth 5)
if ($site9.seoMore.sitemapUrl -ne "https://tripime.com/sitemap.xml") { throw "Test9 FAIL: seoMore update" }
if ($site9.seo.home.title -ne $site8.seo.home.title) { throw "Test9 FAIL: seo wiped" }
$site8.seoMore.sitemapUrl = $originalSitemap
$site9b = Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/seo-more" -Headers $headers -ContentType "application/json" -Body ($site8.seoMore | ConvertTo-Json -Depth 5)
if ($site9b.seoMore.sitemapUrl -ne $originalSitemap) { throw "Test9 FAIL: seoMore restore" }
Write-Host "PASS Test9 website seo-more"

$site10 = Invoke-RestMethod -Method Get -Uri "$base/api/admin/website" -Headers $headers
$originalPages = @($site10.servicePages.pages)
$svcBody = @{
  pages = @(
    @{
      id = "svc_smoke"
      title = "Smoke Service"
      link = "/smoke-service"
      status = "Active"
      metaTitle = "Smoke"
      metaKeywords = ""
      metaDescription = ""
      content = ""
    }
  )
} | ConvertTo-Json -Depth 6
$site11 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/service-pages" -Headers $headers -ContentType "application/json" -Body $svcBody
if (@($site11.servicePages.pages).Count -lt 1) { throw "Test10 FAIL: service page not saved" }
if ($site11.seoMore.sitemapUrl -ne $site10.seoMore.sitemapUrl) { throw "Test10 FAIL: seoMore wiped" }
$restorePages = '{"pages":[]}'
if ($originalPages.Count -gt 0 -and $null -ne $originalPages[0]) {
  $restorePages = @{ pages = $originalPages } | ConvertTo-Json -Depth 6
}
$site12 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/service-pages" -Headers $headers -ContentType "application/json" -Body $restorePages
if (@($site12.servicePages.pages).Count -ne @($originalPages | Where-Object { $_ }).Count) { throw "Test10 FAIL: service pages restore" }
Write-Host "PASS Test10 website service pages"

$site13 = Invoke-RestMethod -Method Get -Uri "$base/api/admin/website" -Headers $headers
$aboutBlocks = @($site13.about.blocks)
if ($aboutBlocks.Count -lt 1) { throw "Test11 FAIL: about missing" }
$originalHeading = $aboutBlocks[0].heading
$aboutBlocks[0].heading = "Smoke About"
$site13.about.blocks = $aboutBlocks
$site14 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/about" -Headers $headers -ContentType "application/json" -Body ($site13.about | ConvertTo-Json -Depth 8)
if ((@($site14.about.blocks)[0]).heading -ne "Smoke About") { throw "Test11 FAIL: about update" }
if (@($site14.servicePages.pages).Count -ne @($site13.servicePages.pages).Count) { throw "Test11 FAIL: service pages wiped" }
$aboutBlocks[0].heading = $originalHeading
$site13.about.blocks = $aboutBlocks
$site15 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/about" -Headers $headers -ContentType "application/json" -Body ($site13.about | ConvertTo-Json -Depth 8)
if ((@($site15.about.blocks)[0]).heading -ne $originalHeading) { throw "Test11 FAIL: about restore" }
Write-Host "PASS Test11 website about ($(@($site15.about.blocks).Count) blocks)"

$site16 = Invoke-RestMethod -Method Get -Uri "$base/api/admin/website" -Headers $headers
if (-not $site16.banners.items) { throw "Test12 FAIL: banners missing" }
$originalBannerActive = $site16.banners.items[0].active
$site16.banners.items[0].active = -not [bool]$originalBannerActive
$site17 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/banners" -Headers $headers -ContentType "application/json" -Body ($site16.banners | ConvertTo-Json -Depth 8)
if ([bool]$site17.banners.items[0].active -eq [bool]$originalBannerActive) { throw "Test12 FAIL: banners update" }
if ($site17.about.blocks[0].heading -ne $site16.about.blocks[0].heading) { throw "Test12 FAIL: about wiped" }
$site16.banners.items[0].active = $originalBannerActive
$site18 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/banners" -Headers $headers -ContentType "application/json" -Body ($site16.banners | ConvertTo-Json -Depth 8)
if ([bool]$site18.banners.items[0].active -ne [bool]$originalBannerActive) { throw "Test12 FAIL: banners restore" }
Write-Host "PASS Test12 website banners ($(@($site18.banners.items).Count))"

$site19 = Invoke-RestMethod -Method Get -Uri "$base/api/admin/website" -Headers $headers
if (-not $site19.deals.items) { throw "Test13 FAIL: deals missing" }
$originalDealTitle = $site19.deals.items[0].title
$site19.deals.items[0].title = "Smoke Deal"
$site20 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/deals" -Headers $headers -ContentType "application/json" -Body ($site19.deals | ConvertTo-Json -Depth 8)
if ($site20.deals.items[0].title -ne "Smoke Deal") { throw "Test13 FAIL: deals update" }
if (@($site20.banners.items).Count -ne @($site19.banners.items).Count) { throw "Test13 FAIL: banners wiped" }
$site19.deals.items[0].title = $originalDealTitle
$site21 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/deals" -Headers $headers -ContentType "application/json" -Body ($site19.deals | ConvertTo-Json -Depth 8)
if ($site21.deals.items[0].title -ne $originalDealTitle) { throw "Test13 FAIL: deals restore" }
Write-Host "PASS Test13 website deals ($(@($site21.deals.items).Count))"

$visaBody = @{
  types = @(
    @{
      id = "visa_smoke"
      imageUrl = ""
      visaType = "Tourist"
      location = "Dubai"
      b2cPrice = 4999
      b2bPrice = 3999
      duration = "30 Days"
      status = "Active"
    }
  )
} | ConvertTo-Json -Depth 6
$site22 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/visa" -Headers $headers -ContentType "application/json" -Body $visaBody
if (@($site22.visa.types).Count -lt 1) { throw "Test14 FAIL: visa not saved" }
if ($site22.deals.items[0].title -ne $site21.deals.items[0].title) { throw "Test14 FAIL: deals wiped" }
$site23 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/visa" -Headers $headers -ContentType "application/json" -Body '{"types":[]}'
if (@($site23.visa.types | Where-Object { $_ }).Count -ne 0) { throw "Test14 FAIL: visa restore" }
Write-Host "PASS Test14 website visa"

$site24 = Invoke-RestMethod -Method Get -Uri "$base/api/admin/website" -Headers $headers
if (-not $site24.testimonials.items) { throw "Test15 FAIL: testimonials missing" }
$originalName = $site24.testimonials.items[0].name
$site24.testimonials.items[0].name = "Smoke Reviewer"
$site25 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/testimonials" -Headers $headers -ContentType "application/json" -Body ($site24.testimonials | ConvertTo-Json -Depth 8)
if ($site25.testimonials.items[0].name -ne "Smoke Reviewer") { throw "Test15 FAIL: testimonials update" }
if (@($site25.visa.types | Where-Object { $_ }).Count -ne 0) { throw "Test15 FAIL: visa wiped" }
$site24.testimonials.items[0].name = $originalName
$site26 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/testimonials" -Headers $headers -ContentType "application/json" -Body ($site24.testimonials | ConvertTo-Json -Depth 8)
if ($site26.testimonials.items[0].name -ne $originalName) { throw "Test15 FAIL: testimonials restore" }
Write-Host "PASS Test15 website testimonials ($(@($site26.testimonials.items).Count))"

function Assert-First($obj, $msg) {
  $row = @($obj)[0]
  if (-not $row) { throw $msg }
  return $row
}

$site27 = Invoke-RestMethod -Method Get -Uri "$base/api/admin/website" -Headers $headers
$origBlog = (Assert-First $site27.blogs.items "Test16 FAIL: blogs missing").heading
$site27.blogs.items[0].heading = "Smoke Blog"
$site28 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/blogs" -Headers $headers -ContentType "application/json" -Body ($site27.blogs | ConvertTo-Json -Depth 8)
if ((@($site28.blogs.items)[0]).heading -ne "Smoke Blog") { throw "Test16 FAIL: blogs update" }
if ((@($site28.testimonials.items)[0]).name -ne (@($site27.testimonials.items)[0]).name) { throw "Test16 FAIL: testimonials wiped" }
$site27.blogs.items[0].heading = $origBlog
$site29 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/blogs" -Headers $headers -ContentType "application/json" -Body ($site27.blogs | ConvertTo-Json -Depth 8)
if ((@($site29.blogs.items)[0]).heading -ne $origBlog) { throw "Test16 FAIL: blogs restore" }
Write-Host "PASS Test16 website blogs"

$vblog = '{"items":[{"id":"vblog_smoke","imageUrl":"","heading":"Smoke Video","videoUrl":"https://example.com/v","excerpt":"","content":"","status":"Active"}]}'
$site30 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/video-blogs" -Headers $headers -ContentType "application/json" -Body $vblog
if (@($site30.videoBlogs.items).Count -lt 1) { throw "Test17 FAIL: video blogs" }
if ((@($site30.blogs.items)[0]).heading -ne $origBlog) { throw "Test17 FAIL: blogs wiped" }
Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/video-blogs" -Headers $headers -ContentType "application/json" -Body '{"items":[]}' | Out-Null
Write-Host "PASS Test17 website video blogs"

$site31 = Invoke-RestMethod -Method Get -Uri "$base/api/admin/website" -Headers $headers
$origMq = (@($site31.marquees.items)[0]).contents
$site31.marquees.items[0].contents = "Smoke marquee"
$site32 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/marquees" -Headers $headers -ContentType "application/json" -Body ($site31.marquees | ConvertTo-Json -Depth 6)
if ((@($site32.marquees.items)[0]).contents -ne "Smoke marquee") { throw "Test18 FAIL: marquee update" }
$site31.marquees.items[0].contents = $origMq
Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/marquees" -Headers $headers -ContentType "application/json" -Body ($site31.marquees | ConvertTo-Json -Depth 6) | Out-Null
Write-Host "PASS Test18 website marquees"

$site33 = Invoke-RestMethod -Method Get -Uri "$base/api/admin/website" -Headers $headers
$origCity = (@($site33.destinations.items)[0]).city
$site33.destinations.items[0].city = "Smoke City"
$site34 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/destinations" -Headers $headers -ContentType "application/json" -Body ($site33.destinations | ConvertTo-Json -Depth 6)
if ((@($site34.destinations.items)[0]).city -ne "Smoke City") { throw "Test19 FAIL: destinations" }
$site33.destinations.items[0].city = $origCity
Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/destinations" -Headers $headers -ContentType "application/json" -Body ($site33.destinations | ConvertTo-Json -Depth 6) | Out-Null
Write-Host "PASS Test19 website destinations"

$site35 = Invoke-RestMethod -Method Get -Uri "$base/api/admin/website" -Headers $headers
$origWhy = (@($site35.why.items)[0]).heading
$site35.why.items[0].heading = "Smoke Why"
$site36 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/why" -Headers $headers -ContentType "application/json" -Body ($site35.why | ConvertTo-Json -Depth 6)
if ((@($site36.why.items)[0]).heading -ne "Smoke Why") { throw "Test20 FAIL: why" }
$site35.why.items[0].heading = $origWhy
Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/why" -Headers $headers -ContentType "application/json" -Body ($site35.why | ConvertTo-Json -Depth 6) | Out-Null
Write-Host "PASS Test20 website why"

$site37 = Invoke-RestMethod -Method Get -Uri "$base/api/admin/website" -Headers $headers
$origFaq = (@($site37.faqs.items)[0]).question
$site37.faqs.items[0].question = "Smoke FAQ?"
$site38 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/faqs" -Headers $headers -ContentType "application/json" -Body ($site37.faqs | ConvertTo-Json -Depth 8)
if ((@($site38.faqs.items)[0]).question -ne "Smoke FAQ?") { throw "Test21 FAIL: faqs" }
$site37.faqs.items[0].question = $origFaq
Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/faqs" -Headers $headers -ContentType "application/json" -Body ($site37.faqs | ConvertTo-Json -Depth 8) | Out-Null
Write-Host "PASS Test21 website faqs"

$site39 = Invoke-RestMethod -Method Get -Uri "$base/api/admin/website" -Headers $headers
$origPrice = (@($site39.flightRoutes.items)[0]).price
$site39.flightRoutes.items[0].price = 111
$site40 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/flight-routes" -Headers $headers -ContentType "application/json" -Body ($site39.flightRoutes | ConvertTo-Json -Depth 6)
if ((@($site40.flightRoutes.items)[0]).price -ne 111) { throw "Test22 FAIL: flight routes" }
if ((@($site40.faqs.items)[0]).question -ne $origFaq) { throw "Test22 FAIL: faqs wiped" }
$site39.flightRoutes.items[0].price = $origPrice
Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/flight-routes" -Headers $headers -ContentType "application/json" -Body ($site39.flightRoutes | ConvertTo-Json -Depth 6) | Out-Null
Write-Host "PASS Test22 website flight routes"

$site41 = Invoke-RestMethod -Method Get -Uri "$base/api/admin/website" -Headers $headers
if (-not $site41.airlines.items) { throw "Test23 FAIL: airlines missing" }
$origAirline = (@($site41.airlines.items)[0]).name
$site41.airlines.items[0].name = "Smoke Air"
$site42 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/airlines" -Headers $headers -ContentType "application/json" -Body ($site41.airlines | ConvertTo-Json -Depth 6)
if ((@($site42.airlines.items)[0]).name -ne "Smoke Air") { throw "Test23 FAIL: airlines update" }
if ((@($site42.flightRoutes.items)[0]).fromCode -ne (@($site41.flightRoutes.items)[0]).fromCode) { throw "Test23 FAIL: routes wiped" }
$site41.airlines.items[0].name = $origAirline
Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/airlines" -Headers $headers -ContentType "application/json" -Body ($site41.airlines | ConvertTo-Json -Depth 6) | Out-Null
Write-Host "PASS Test23 website airlines"

$busBody = '{"items":[{"id":"bus_smoke","fromCity":"Delhi","toCity":"Jaipur","status":"Active"}]}'
$site43 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/bus-routes" -Headers $headers -ContentType "application/json" -Body $busBody
if (@($site43.busRoutes.items).Count -lt 1) { throw "Test24 FAIL: bus routes" }
if ((@($site43.airlines.items)[0]).name -ne $origAirline) { throw "Test24 FAIL: airlines wiped" }
Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/bus-routes" -Headers $headers -ContentType "application/json" -Body '{"items":[]}' | Out-Null
Write-Host "PASS Test24 website bus routes"

$site44 = Invoke-RestMethod -Method Get -Uri "$base/api/admin/website" -Headers $headers
$origWa = $site44.social.whatsapp
$site44.social.whatsapp = "9000000000"
$site45 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/social" -Headers $headers -ContentType "application/json" -Body ($site44.social | ConvertTo-Json -Depth 4)
if ($site45.social.whatsapp -ne "9000000000") { throw "Test25 FAIL: social update" }
$site44.social.whatsapp = $origWa
Invoke-RestMethod -Method Put -Uri "$base/api/admin/website/social" -Headers $headers -ContentType "application/json" -Body ($site44.social | ConvertTo-Json -Depth 4) | Out-Null
Write-Host "PASS Test25 website social"

# --- Test 26: Custom themes PUT merge ---
$themes = Invoke-RestMethod -Method Get -Uri "$base/api/admin/themes" -Headers $headers
$themeCount = @($themes).Count
if ($themeCount -lt 1) { throw "Test26 FAIL: themes missing" }
$smokeTheme = @{
  id = "theme_smoke"
  kind = "desktop"
  name = "Smoke Desktop"
  previewUrl = "https://images.pexels.com/photos/457882/pexels-photo-457882.jpeg?auto=compress&cs=tinysrgb&w=400"
  active = $true
  selected = $false
}
$themeBody = @{ items = (@($themes) + $smokeTheme) } | ConvertTo-Json -Depth 6
$themes2 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/themes" -Headers $headers -ContentType "application/json" -Body $themeBody
if (@($themes2).Count -ne ($themeCount + 1)) { throw "Test26 FAIL: theme add" }
$restoreThemes = @{ items = @($themes) } | ConvertTo-Json -Depth 6
$themes3 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/themes" -Headers $headers -ContentType "application/json" -Body $restoreThemes
if (@($themes3).Count -ne $themeCount) { throw "Test26 FAIL: theme restore" }
Write-Host "PASS Test26 custom themes ($themeCount)"

# --- Test 27: Marketing banners PUT does not wipe videos ---
$banners = Invoke-RestMethod -Method Get -Uri "$base/api/admin/marketing" -Headers $headers
$videos = Invoke-RestMethod -Method Get -Uri "$base/api/admin/marketing-videos" -Headers $headers
$bannerCount = @($banners).Count
$videoCount = @($videos).Count
if ($bannerCount -lt 1) { throw "Test27 FAIL: banners missing" }
$origTitle = (@($banners)[0]).title
$banners[0].title = "Smoke Banner"
$bannerBody = @{ items = @($banners) } | ConvertTo-Json -Depth 6
$banners2 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/marketing" -Headers $headers -ContentType "application/json" -Body $bannerBody
if ((@($banners2)[0]).title -ne "Smoke Banner") { throw "Test27 FAIL: banner update" }
$videos2 = Invoke-RestMethod -Method Get -Uri "$base/api/admin/marketing-videos" -Headers $headers
if (@($videos2).Count -ne $videoCount) { throw "Test27 FAIL: videos wiped" }
$banners[0].title = $origTitle
Invoke-RestMethod -Method Put -Uri "$base/api/admin/marketing" -Headers $headers -ContentType "application/json" -Body (@{ items = @($banners) } | ConvertTo-Json -Depth 6) | Out-Null
Write-Host "PASS Test27 marketing banners ($bannerCount)"

# --- Test 28: Marketing videos PUT ---
$origVidTitle = (@($videos)[0]).title
$videos[0].title = "Smoke Video"
$vidBody = @{ items = @($videos) } | ConvertTo-Json -Depth 6
$videos3 = Invoke-RestMethod -Method Put -Uri "$base/api/admin/marketing-videos" -Headers $headers -ContentType "application/json" -Body $vidBody
if ((@($videos3)[0]).title -ne "Smoke Video") { throw "Test28 FAIL: video update" }
$banners3 = Invoke-RestMethod -Method Get -Uri "$base/api/admin/marketing" -Headers $headers
if ((@($banners3)[0]).title -ne $origTitle) { throw "Test28 FAIL: banners wiped" }
$videos[0].title = $origVidTitle
Invoke-RestMethod -Method Put -Uri "$base/api/admin/marketing-videos" -Headers $headers -ContentType "application/json" -Body (@{ items = @($videos) } | ConvertTo-Json -Depth 6) | Out-Null
Write-Host "PASS Test28 marketing videos ($videoCount)"

# --- Test 29: Customer login log ---
$customers = Invoke-RestMethod -Method Get -Uri "$base/api/admin/customers" -Headers $headers
if (@($customers).Count -lt 1) { throw "Test29 FAIL: customers missing" }
if (-not (@($customers)[0]).email) { throw "Test29 FAIL: customer email" }
Write-Host "PASS Test29 customers ($(@($customers).Count))"

# --- Test 30: Flight search log ---
$searches = Invoke-RestMethod -Method Get -Uri "$base/api/admin/flight-searches" -Headers $headers
if (@($searches).Count -lt 1) { throw "Test30 FAIL: searches missing" }
if (-not (@($searches)[0]).fromCode) { throw "Test30 FAIL: fromCode" }
Write-Host "PASS Test30 flight searches ($(@($searches).Count))"

$stats = Invoke-RestMethod -Method Get -Uri "$base/api/admin/stats" -Headers $headers
Write-Host "PASS stats totalBookings=$($stats.totalBookings)"
Write-Host "ALL_PASSED"
