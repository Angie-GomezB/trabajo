-- =============================================
-- Proceso: Get_Todos_Los_Clientes
-- Descripción: Obtiene todos los clientes sin filtros
-- =============================================
--START_PARAM
declare @Usuario varchar(200) = 'angie'
--END_PARAM
set transaction isolation level read uncommitted

select
    Id_Cliente,
    Id_Fiscal,
    Nm_Cliente1,
    Nm_Cliente2,
    Ap_Cliente1,
    Ap_Cliente2,
    email,
    telefono,
    direccion,
    ciudad,
    activo,
    Fecha_Creacion,
    Created_By,
    Updated_By,
    Fecha_Actualizacion
from Fact_Clientes
order by Id_Cliente;