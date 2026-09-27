# Coastal model data notices

Code follows the repository licence. Source datasets retain their own licences.

Contains information licensed under the Open Government Licence – Vancouver.
City source: https://opendata.vancouver.ca/explore/dataset/lidar-2022/
City 2022 aerial imagery: https://opendata.vancouver.ca/explore/dataset/orthophoto-imagery-2022/
Imagery captured June 6–July 1, 2022; appearance only, not elevation or bathymetry.
Licence: https://opendata.vancouver.ca/pages/licence/

Contains information licensed under the Open Government Licence – Metro Vancouver.
Supplemental source: Vancouver Area Bare Earth LiDAR 2022, item d510200c39294832aa7dffab716adfa2.
https://www.arcgis.com/home/item.html?id=d510200c39294832aa7dffab716adfa2
Licence: https://open-data-portal-metrovancouver.hub.arcgis.com/pages/Open%20Government%20Licence
CGVD28GVRD2018 heights are used in the nominal local CGVD28GVRD visualization space with no
fitted vertical shift, after comparison against City LiDAR. This is not a survey-grade transformation.

CHS NONNA data and this derivative are **not for navigation**. Vertical relationships are approximate
and unsuitable for surveying. Missing and interpolated source coverage must remain identified.

The following derivative-product notice is required by section 7 of the
[CHS NONNA Licence](https://api-proxy.edh-cde.dfo-mpo.gc.ca/catalogue/records/d3881c4c-650d-4070-bf9b-1e00aabf0a1d/attachments/CHS_NONNA_LICENCE-LICENCE_NONNA_DU_SHC.pdf):

This product was made by the Van Beaches project and contains intellectual property of the
Canadian Hydrographic Service (CHS) of the Department of Fisheries and Oceans.

This product does not meet the requirements of the Navigation Safety Regulations, 2020 under
the Canada Shipping Act, 2001. Charts and publications issued by or on the authority of CHS
must be used to meet the requirements of those regulations.

The copyright in the data are and remain the property of His Majesty the King in Right of Canada
and shall not be sold, licensed, leased, assigned or given to a third party.

The incorporation of CHS data in this product does not constitute an endorsement or an approval
of this product by the Canadian Hydrographic Service, the Department of Fisheries and Oceans
or His Majesty the King in Right of Canada.
# Regional terrain — Phase 5

Contains information licensed under the Open Government Licence – Canada:
https://open.canada.ca/en/open-government-licence-canada

Natural Resources Canada, CanElevation High Resolution Digital Elevation Model Mosaic
(DTM, 2 m catalogue) and Medium Resolution Digital Elevation Model (DTM, 30 m).
Source COGs, catalogue responses, acquisition dates, valid-pixel coverage, fallback usage,
processing resolutions and hashes are recorded by the regional pipeline.
https://open.canada.ca/data/en/dataset/0fe65119-e96e-4a57-8bfe-9d9245fba06b
https://natural-resources.canada.ca/maps-tools-publications/satellite-elevation-air-photos/national-elevation-data-strategy

Regional heights use an approximate -0.12 m CGVD2013-to-local-world conversion based on
Vancouver station 07735. This is not a survey-grade regional datum transformation.
Snow is a configurable visual parameter, not observed snowpack.

# Urban context — Phase 6

Contains City of Vancouver building footprints 2009, derived from City LiDAR and used
under the Open Government Licence – Vancouver:
https://opendata.vancouver.ca/explore/dataset/building-footprints-2009/
https://opendata.vancouver.ca/pages/licence/
Building massing is a dated 2009 source, not a present-day architectural inventory.

Roads, bridge alignments/supports, waterfront and land cover contain OpenStreetMap data:
© OpenStreetMap contributors, Open Database Licence (ODbL) 1.0.
https://www.openstreetmap.org/copyright
The derived urban database is distributed separately in the content-hashed urban JSON
assets with source IDs, source hashes, retrieval timestamps and licence attribution.
Bridge deck elevations are approximate visualization parameters, not navigation clearances.

Optical ocean affiliation in unknown survey cells also uses OpenStreetMap natural=coastline
under ODbL 1.0. The sourced coastline supplies only a two-dimensional sea/land classification
where measured bed elevations are absent. No bathymetric heights, tide-responsive shoreline,
or vessel clearances are inferred from this fallback. Source query, SHA-256 and retrieval time
are retained with the marine mask descriptor. Blue=255 marks these optical-only PNG cells.
