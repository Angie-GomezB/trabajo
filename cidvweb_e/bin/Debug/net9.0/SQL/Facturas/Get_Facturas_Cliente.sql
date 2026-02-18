-- =========================================================
-- Proceso: Get_Facturas_Cliente
-- Descripción: Consulta facturas actuales de un cliente
-- =========================================================

--START_PARAM
declare 
    @Id_Cliente int = 1
--END_PARAM

set transaction isolation level read uncommitted

select
    f.Id_Factura,
    f.Sucursal_Emisora,
    f.Numero_Factura,
    f.Secuencia_Factura,
    f.Fecha_Emision,

    f.Valor_Factura,
    f.Valor_Impuesto,
    f.Base_Calculo,
    f.Porcentaje_Impuesto,

    f.Tipo_Factura,
    f.modalidad,
    f.Tipo_Servicio,
    f.Estado_Factura,

    f.Fecha_Creacion,
    f.Created_By,
    f.Fecha_Actualizacion,
    f.Updated_By
from Fact_Facturas f
where f.Id_Cliente = @Id_Cliente
order by f.Fecha_Emision desc;
