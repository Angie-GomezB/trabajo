-- =========================================================
-- Proceso: Upd_Facturas
-- Descripción: Actualiza factura y guarda historial
-- =========================================================

--START_PARAM
declare
    @Id_Factura          int = 1,
    @Valor_Factura       decimal(18,2) = 95000,
    @Valor_Impuesto      decimal(18,2) = 18050,
    @Estado_Factura      varchar(50)   = 'AJUSTADA',
    @observaciones       varchar(500)  = 'Ajuste por reclamo',
    @Motivo_Cambio       varchar(300)  = 'Correccion valor',
    @usuario             varchar(100)  = 'angie'
--END_PARAM

set transaction isolation level read uncommitted

-- 1 Guardar estado anterior
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

-- 2 Actualizar factura
update Fact_Facturas
set
    Valor_Factura = @Valor_Factura,
    Valor_Impuesto = @Valor_Impuesto,
    Estado_Factura = @Estado_Factura,
    observaciones = @observaciones,
    Fecha_Actualizacion = getdate(),
    Updated_By = @usuario
where Id_Factura = @Id_Factura;




