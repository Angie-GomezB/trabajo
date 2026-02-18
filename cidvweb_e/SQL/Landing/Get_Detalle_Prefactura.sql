-- =============================================
-- Proceso: Template
-- Descripción:
-- =============================================
--START_PARAM
declare @Token varchar(100) = '0847253E-53D1-42CA-8909-8222B84C0F38'
--END_PARAM
set transaction isolation level read uncommitted

declare @Id_Prefactura_CIDV int, @Gestionado bit

select top 1 @Id_Prefactura_CIDV = Id_Prefactura_CIDV, @Gestionado = case when Fecha_Aprobado is not null or Fecha_Actualizacion is not null then 1 else 0 end
from Fact_Prefacturas_CIDV
where Token = @Token/* and Is_Active = 1*/

if @Gestionado = 1
	select 'NA' as Resultado
else
	exec Ws_RPA_Get_Email_CIDV @Id_Prefactura_CIDV, 1