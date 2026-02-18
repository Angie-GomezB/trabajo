-- =========================================================
-- Proceso: Get_Facturas_Historial
-- =========================================================

--START_PARAM
declare @Id_Factura int = 1
--END_PARAM

set transaction isolation level read uncommitted

select
    Id_Historial,
    Id_Factura,
    Valor_Factura,
    Valor_Impuesto,
    Estado_Factura,
    Motivo_Cambio,
    Fecha_Cambio,
    Usuario_Cambio
from Log_Facturas_Historial
where Id_Factura = @Id_Factura
order by Fecha_Cambio desc;
