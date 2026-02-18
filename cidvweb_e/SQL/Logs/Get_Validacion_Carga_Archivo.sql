-- =============================================
-- Proceso: Logs/Get_Validacion_Carga_Archivo
-- Descripción:
-- =============================================
--START_PARAM
declare 
	@Proceso varchar(100),
	@Archivo varchar(200)
--END_PARAM
set transaction isolation level read uncommitted

if exists (select * from Log_Carga_Archivos where Proceso = @Proceso and Archivo = @Archivo)
	select 'Ya existe'
else
	select 'OK'