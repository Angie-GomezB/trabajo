-- =============================================
-- Proceso: Get_Todas_Las_Facturas
-- Descripcion: Obtiene todas las facturas sin filtros
-- =============================================

--START_PARAM
declare @Usuario varchar(200) = null
--END_PARAM

set transaction isolation level read uncommitted

select
    f.Id_Factura,
    f.Sucursal_Emisora,
    f.Numero_Factura,
    f.Secuencia_Factura,
    f.Id_Cliente,
    f.Fecha_Emision,
    f.Valor_Factura,
    f.Valor_Impuesto,
    f.Base_Calculo,
    f.Porcentaje_Impuesto,
    f.Tipo_Factura,
    f.modalidad,
    f.Tipo_Servicio,
    f.Estado_Factura,
    f.Codigo_Ean_Fedex,
    f.observaciones,
    f.Fecha_Creacion,
    f.Created_By,
    f.Fecha_Actualizacion,
    f.Updated_By,
    c.Id_Fiscal,
    c.Nm_Cliente1,
    c.Ap_Cliente1
from Fact_Facturas f
inner join Fact_Clientes c
    on c.Id_Cliente = f.Id_Cliente
order by f.Id_Factura desc;