-- =============================================
-- Proceso: Get_Clientes
-- Descripcion: Consulta de clientes
-- =============================================

--START_PARAM
declare
    @Id_Fiscal     varchar(20)  = null,
    @Filtro_Nombre varchar(200) = null,
    @Usuario       varchar(200) = 'angie'
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
where 1 = 1
    and (@Id_Fiscal is null or Id_Fiscal like @Id_Fiscal + '%')
    and (
        @Filtro_Nombre is null
        or lower(ISNULL(Nm_Cliente1, '') + ' ' + ISNULL(Ap_Cliente1, ''))
           like '%' + lower(@Filtro_Nombre) + '%'
    )
order by Id_Cliente;
