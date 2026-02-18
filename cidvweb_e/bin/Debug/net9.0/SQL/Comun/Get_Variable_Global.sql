-- =============================================
-- Proceso: Comun/Get_Variable_Global
-- Descripción:
-- =============================================
--START_PARAM
declare @Nombre varchar(50)
--END_PARAM
set transaction isolation level read uncommitted

select Valor
from Dim_Variables_Globales
where Nombre = @Nombre