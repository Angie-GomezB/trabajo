-- =========================================================
-- Proceso: Get_Facturas
-- Descripción: Consulta facturas
-- =========================================================

--START_PARAM
declare
    @Id_Cliente int = null
--END_PARAM

set transaction isolation level read uncommitted

select
    f.Id_Factura,
    f.Numero_Factura,
    f.Fecha_Emision,
    f.Valor_Factura,
    f.Estado_Factura,
    c.Id_Fiscal,
    c.Nm_Cliente1,
    c.Ap_Cliente1
from Fact_Facturas f
inner join Fact_Clientes c
    on c.Id_Cliente = f.Id_Cliente
where (@Id_Cliente is null or f.Id_Cliente = @Id_Cliente)
order by f.Id_Factura desc;
