-- =============================================
-- Proceso: Get_Clientes_Id
-- Descripción:
-- =============================================

--START_PARAM
declare @Id_Cliente int = 2
--END_PARAM

set transaction isolation level read uncommitted

select *
from Fact_Clientes
where Id_Cliente = @Id_Cliente;
