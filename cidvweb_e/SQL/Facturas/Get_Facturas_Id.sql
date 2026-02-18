-- =========================================================
-- Proceso: Get_Facturas_Id
-- =========================================================

--START_PARAM
declare @Id_Factura int = 1
--END_PARAM

set transaction isolation level read uncommitted

select *
from Fact_Facturas
where Id_Factura = @Id_Factura;
