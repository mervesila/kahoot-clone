FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore src/WebAPI/TKI.WebAPI/TKI.WebAPI.csproj && dotnet publish src/WebAPI/TKI.WebAPI/TKI.WebAPI.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_ENVIRONMENT=Production
COPY --from=build /app/publish .
ENTRYPOINT ["/bin/sh", "-c", "ASPNETCORE_URLS=http://+:${PORT:-8080} dotnet TKI.WebAPI.dll"]
