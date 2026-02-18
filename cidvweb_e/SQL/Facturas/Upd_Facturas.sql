-- =========================================================
-- Proceso: Upd_Facturas
-- Descripción: Actualiza factura y guarda historial
-- =========================================================

--START_PARAM
declare
    @Id_Factura          int          = 1,
    @Sucursal_Emisora    varchar(50)  = 'FEDEX-BOG',
    @Numero_Factura      varchar(50)  = 'FAC-001',
    @Secuencia_Factura   int          = 1,
    @Fecha_Emision       date         = '2026-02-10',
    @Valor_Factura       decimal(18,2)= 95000,
    @Valor_Impuesto      decimal(18,2)= 18050,
    @Base_Calculo        decimal(18,2)= 100000,
    @Porcentaje_Impuesto decimal(5,2) = 19,
    @Tipo_Factura        varchar(50)  = 'SERVICIO',
    @modalidad           varchar(50)  = 'CONTADO',
    @Tipo_Servicio       varchar(100) = 'ENVIO',
    @Estado_Factura      varchar(50)  = 'AJUSTADA',
    @Codigo_ean_Fedex    varchar(50)  = null,
    @observaciones       varchar(500) = null,
    @Motivo_Cambio       varchar(300) = 'Correccion valor',
    @usuario             varchar(100) = null
--END_PARAM

set transaction isolation level read uncommitted

-- 1. Guardar estado anterior en historial
insert into Log_Facturas_Historial
(
    Id_Factura,
    Valor_Factura,
    Valor_Impuesto,
    Base_Calculo,
    Porcentaje_Impuesto,
    Estado_Factura,
    observaciones,
    Motivo_Cambio,
    Usuario_Cambio
)
select
    Id_Factura,
    Valor_Factura,
    Valor_Impuesto,
    Base_Calculo,
    Porcentaje_Impuesto,
    Estado_Factura,
    observaciones,
    @Motivo_Cambio,
    @usuario
from Fact_Facturas
where Id_Factura = @Id_Factura;

-- 2. Actualizar todos los campos de la factura
update Fact_Facturas
set
    Sucursal_Emisora    = @Sucursal_Emisora,
    Numero_Factura      = @Numero_Factura,
    Secuencia_Factura   = @Secuencia_Factura,
    Fecha_Emision       = @Fecha_Emision,
    Valor_Factura       = @Valor_Factura,
    Valor_Impuesto      = @Valor_Impuesto,
    Base_Calculo        = @Base_Calculo,
    Porcentaje_Impuesto = @Porcentaje_Impuesto,
    Tipo_Factura        = @Tipo_Factura,
    modalidad           = @modalidad,
    Tipo_Servicio       = @Tipo_Servicio,
    Estado_Factura      = @Estado_Factura,
    Codigo_Ean_Fedex    = @Codigo_ean_Fedex,
    observaciones       = @observaciones,
    Fecha_Actualizacion = getdate(),
    Updated_By          = @usuario
where Id_Factura = @Id_Factura;

