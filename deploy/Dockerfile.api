FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY backend/FanEngagement.sln .
COPY backend/FanEngagement.Api/FanEngagement.Api.csproj backend/FanEngagement.Api/
COPY backend/FanEngagement.Application/FanEngagement.Application.csproj backend/FanEngagement.Application/
COPY backend/FanEngagement.Domain/FanEngagement.Domain.csproj backend/FanEngagement.Domain/
COPY backend/FanEngagement.Infrastructure/FanEngagement.Infrastructure.csproj backend/FanEngagement.Infrastructure/
COPY backend/FanEngagement.Tests/FanEngagement.Tests.csproj backend/FanEngagement.Tests/

RUN dotnet restore backend/FanEngagement.Api/FanEngagement.Api.csproj

COPY backend/. ./backend/
WORKDIR /src/backend/FanEngagement.Api
RUN dotnet publish -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "FanEngagement.Api.dll"]
